const File = require('../../db/models/file.js');
const Chunk = require('../../db/models/chunk.js');
const {request, gql} = require('graphql-request');
const {
    hashFn,
    merkle,
    makeSurePathExistsAsync,
    delay,
    areScalarArraysEqual,
    escape
} = require('#utils');
const Arweave = require('arweave');
const {promises: fs} = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const config = require('config');

// TODO: for some reason docker fails to resolve module if I move it to another file
// TODO: possibly split this file into several ones after migrating to modules
const getDownloadQuery = chunkId =>
    gql`{
      transactions(
        tags: [
          {
            name: "__pn_chunk_${config.get(
        'storage.arweave_experiment_version_major'
    )}.${config.get('storage.arweave_experiment_version_minor')}_id",
            values: ["${chunkId}"]
          }
        ]
      ) {
        edges {
          node {
            id
          }
        }
      }
    }`;

// We are using one status for both upload and download, because, since file's id is its
// data hash, if file is downloaded, then it's also uploaded, and vice versa
// TODO: apply migration and rename dl_status to status to avoid confusion
const DOWNLOAD_UPLOAD_STATUS = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

const FILE_TYPE = {
    fileptr: 'fileptr', // File
    dirptr: 'dirptr' // Directory
};

const CHUNKINFO_PROLOGUE = 'PN^CHUNK\x05$\x06z\xf5*INFO';
const CONCURRENT_DOWNLOAD_DELAY = config.get('storage.concurrent_download_delay');

const cacheDir = path.join(config.get('datadir'), config.get('storage.cache_path'));
const filesDir = path.join(config.get('datadir'), config.get('storage.files_path'));

let logger;
let arweave;
const init = async ctx => {
    logger = ctx.log.child({module: 'Storage'});
    await Promise.all([makeSurePathExistsAsync(cacheDir), makeSurePathExistsAsync(filesDir)]);
    arweave =  Arweave.init({
        port: config.get('storage.arweave_port'),
        protocol: config.get('storage.arweave_protocol'),
        host: config.get('storage.arweave_host')
    });

};

// TODO: add better error handling with custom errors and keeping error messages in DB
const getChunk = async (chunkId, encoding = 'utf8', useCache = true) => {
    const chunk = await Chunk.findByIdOrCreate(chunkId);
    const chunkPath = path.join(cacheDir, `chunk_${chunkId}`);

    if (useCache && chunk.dl_status === DOWNLOAD_UPLOAD_STATUS.COMPLETED) {
        logger.debug({chunkId}, 'Returning chunk from cache');
        return fs.readFile(chunkPath, {encoding});
    }
    if (chunk.dl_status === DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS) {
        logger.debug({chunkId}, 'Chunk download already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getChunk(chunkId, encoding); // use cache should be true in this case
    }

    logger.debug({chunkId}, 'Downloading chunk');
    try {
        chunk.dl_status = DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS;
        await chunk.save();

        const query = getDownloadQuery(chunkId);

        const queryResult = await request(config.get('storage.arweave_gateway_url'), query);
        logger.debug({chunkId}, 'Graphql request success');
        for (const edge of queryResult.transactions.edges) {
            const txid = edge.node.id;
            logger.debug({chunkId, txid}, 'Downloading data from arweave');

            let data;
            let buf;
            if (process.env.MODE === 'zappdev'){
                data = (await axios.get('http://' + config.arweave_host + ':' + config.arweave_port + '/tx/' +  txid + '/data')).data;
                buf = Buffer.from(data, 'base64');
            }else{
                data = await arweave.transactions.getData(txid, {decode: true});
                buf = Buffer.from(data);
            }
            
            logger.debug({chunkId, txid}, 'Successfully downloaded data from arweave');

            const hash = hashFn(buf).toString('hex');
            if (hash !== chunk.id) {
                logger.warn(
                    {chunkId, hash, query, buf: buf.toString()},
                    'Chunk id and data do not match, chunk id'
                );
                continue;
            }

            await fs.writeFile(chunkPath, buf);

            chunk.size = buf.length;
            chunk.dl_status = DOWNLOAD_UPLOAD_STATUS.COMPLETED;
            await chunk.save();
            return buf;
        }

        throw new Error('No matching hash found in arweave');
    } catch (e) {
        logger.error({chunkId, message: e.message, stack: e.stack}, 'Chunk download failed');
        chunk.dl_status = DOWNLOAD_UPLOAD_STATUS.FAILED;
        await chunk.save();
        throw e;
    }
};

const signTx = async (data, tags) => {
    // Real 'AR' mode
    
    const transaction = await arweave.createTransaction({data}, config.arweave_key);

    for(const k in tags){
        const v = tags[k];
        transaction.addTag(k, v);
    }

    // Sign
    await arweave.transactions.sign(transaction, config.arweave_key);

    return transaction;
};

const broadcastTx = async (transaction) => {
    const uploader = await arweave.transactions.getUploader(transaction);
    while (!uploader.isComplete) { await uploader.uploadChunk(); }

    return transaction;
};

async function uploadArweave (data, tags) {
    // upload to areweave directly without using bundler
    let transaction = await signTx(data, tags);
    transaction = await broadcastTx(transaction);
    const txid = transaction.id;
    logger.debug({txid}, 'Transaction id successfully generated');
    const response = {data: {status: 'ok'}};
    return response;
}

const uploadBundler = async (data, tags) => {
    // upload to point bundler to forward to arweave
    const formData = new FormData();
    formData.append('file', data);
    // add tags
    for(const k in tags) {
        const v = tags[k];
        formData.append(k, v);
    }

    const response = await axios.post(
        `${config.get('storage.arweave_bundler_url')}/signPOST`,
        formData,
        {headers: {...formData.getHeaders()}}
    );
    return response;
};

const uploadChunk = async data => {
    const chunkId = hashFn(data).toString('hex');

    const chunk = await Chunk.findByIdOrCreate(chunkId);
    if (chunk.dl_status === DOWNLOAD_UPLOAD_STATUS.COMPLETED) {
        logger.debug({chunkId}, 'Chunk already exists, cancelling upload');
        return chunkId;
    }
    if (chunk.dl_status === DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS) {
        logger.debug({chunkId}, 'Chunk upload already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return uploadChunk(data);
    }

    logger.debug({chunkId}, 'Starting chunk upload');
    try {
        chunk.dl_status = DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS;
        await chunk.save();

        const chunkIdVersioned = `__pn_chunk_${config.get('storage.arweave_experiment_version_major')}.${config.get(
            'storage.arweave_experiment_version_minor'
        )}_id`;

        const tags = {
            __pn_integration_version_major: config.get('storage.arweave_experiment_version_major'),
            __pn_integration_version_minor: config.get('storage.arweave_experiment_version_minor'),
            __pn_chunk_id: chunkId,
            [chunkIdVersioned]: chunkId
        };

        let response;
        if (config.get('storage.use_arweave_bundler'))
            response = await uploadBundler(data, tags);
        else
            response = await uploadArweave(data, tags);
            
        
        //TODO: check status from bundler
        if (response.data.status !== 'ok') {
            throw new Error(`Chunk ${chunkId} uploading failed: arweave endpoint error: ${
                JSON.stringify(response.data, null, 2)
            }`);
        }

        logger.debug({chunkId}, 'Chunk successfully uploaded, saving to disk');

        await fs.writeFile(path.join(cacheDir, `chunk_${chunkId}`), data);
        chunk.dl_status = DOWNLOAD_UPLOAD_STATUS.COMPLETED;
        chunk.size = data.length;
        await chunk.save();

        logger.debug({chunkId}, 'Chunk successfully uploaded and saved');

        return chunkId;
    } catch (e) {
        logger.error({chunkId, message: e.message, stack: e.stack}, 'Chunk upload failed');
        chunk.dl_status = DOWNLOAD_UPLOAD_STATUS.FAILED;
        await chunk.save();
        throw e;
    }
};

const uploadFile = async data => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    const CHUNK_SIZE = config.get('storage.chunk_size_bytes');
    const totalChunks = Math.ceil(buf.length / CHUNK_SIZE);

    if (totalChunks === 1) {
        const fileId = hashFn(buf).toString('hex');
        logger.debug({fileId}, 'File to be uploaded and consists only from 1 chunk');

        const filePath = path.join(filesDir, `file_${fileId}`);
        const file = await File.findByIdOrCreate(fileId, {original_path: filePath});
        if (file.dl_status === DOWNLOAD_UPLOAD_STATUS.COMPLETED) {
            logger.debug({fileId}, 'File already exists, cancelling upload');
            return fileId;
        }
        if (file.dl_status === DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS) {
            logger.debug({fileId}, 'File  upload already in progress, waiting');
            await delay(CONCURRENT_DOWNLOAD_DELAY);
            return uploadFile(data);
        }

        logger.debug({fileId}, 'Starting file upload');
        try {
            file.dl_status = DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS;
            await file.save();

            const chunkId = await uploadChunk(buf);
            if (chunkId !== fileId) {
                throw new Error(
                    `Unexpected different ids for file and it's only chunk: ${fileId}, ${chunkId}`
                );
            }

            await fs.writeFile(filePath, buf);
            file.size = buf.length;
            file.dl_status = DOWNLOAD_UPLOAD_STATUS.COMPLETED;
            await file.save();

            logger.debug({fileId}, 'File successfully uploaded');

            return fileId;
        } catch (e) {
            logger.error({fileId, message: e.message, stack: e.stack}, 'File upload failed');
            file.dl_status = DOWNLOAD_UPLOAD_STATUS.FAILED;
            await file.save();
            throw e;
        }
    }

    const chunks = [];
    for (let i = 0; i < totalChunks; i++) {
        chunks.push(buf.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }

    const chunkHashes = chunks.map(chunk => hashFn(chunk).toString('hex'));
    const merkleTree = merkle.merkle(
        chunkHashes.map(x => Buffer.from(x, 'hex')),
        hashFn
    );
    const chunkInfoContents =
        CHUNKINFO_PROLOGUE +
        JSON.stringify({
            type: 'file',
            chunks: chunkHashes,
            hash: 'keccak256',
            filesize: buf.length,
            merkle: merkleTree.map(x => x.toString('hex'))
        });
    const chunkInfoBuffer = Buffer.from(chunkInfoContents, 'utf-8');

    // File id always matches it's index chunk id
    const fileId = hashFn(chunkInfoBuffer).toString('hex');

    logger.debug({fileId}, 'Successfully chunkified file');
    const filePath = path.join(filesDir, `file_${fileId}`);

    const file = await File.findByIdOrCreate(fileId, {original_path: filePath});
    if (file.dl_status === DOWNLOAD_UPLOAD_STATUS.COMPLETED) {
        logger.debug({fileId}, 'File already exists, cancelling upload');
        return fileId;
    }
    if (file.dl_status === DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS) {
        logger.debug({fileId}, 'File upload already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return uploadFile(data);
    }

    logger.debug({fileId}, 'Uploading file');
    try {
        // TODO: retry logic
        file.dl_status = DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS;
        await file.save();

        const indexChunkId = await uploadChunk(chunkInfoBuffer);
        if (indexChunkId !== fileId) {
            throw new Error(
                `Unexpected different ids for file and it's index chunk: ${fileId}, ${indexChunkId}`
            );
        }
        const chunkIds = await Promise.all(chunks.map(chunk => uploadChunk(chunk)));
        chunkIds.forEach((chunkId, index) => {
            if (chunkId !== chunkHashes[index]) {
                throw new Error(
                    `Unexpected different chunks ids, should be same: ${
                        (chunkId, chunkHashes[index])
                    }`
                );
            }
        });

        logger.debug({fileId}, 'File successfully uploaded, saving to disk');

        await fs.writeFile(filePath, buf);
        file.size = buf.length;
        file.dl_status = DOWNLOAD_UPLOAD_STATUS.COMPLETED;
        await file.save();

        logger.debug({fileId}, 'File successfully uploaded and saved');
        return fileId;
    } catch (e) {
        logger.error({fileId, message: e.message, stack: e.stack}, 'File upload failed');
        file.dl_status = DOWNLOAD_UPLOAD_STATUS.FAILED;
        await file.save();
        throw e;
    }
};

const uploadDir = async dirPath => {
    try {
        const stat = await fs.stat(dirPath);
        const isDir = stat.isDirectory();
        if (!isDir) {
            throw new Error(`Path ${escape(dirPath)} is not a directory`);
        }
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new Error(`Directory ${escape(dirPath)} does not exist`);
        }
        throw e;
    }

    logger.debug({dirPath: escape(dirPath)}, 'Uploading directory');

    const files = await fs.readdir(dirPath);
    const dirInfo = {
        type: 'dir',
        files: []
    };

    await Promise.all(
        files.map(async fileName => {
            const filePath = path.join(dirPath, fileName);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                const dirId = await uploadDir(filePath);
                dirInfo.files.push({
                    type: FILE_TYPE.dirptr,
                    name: fileName,
                    original_path: filePath,
                    size: stat.size,
                    id: dirId
                });
            } else {
                const file = await fs.readFile(filePath);
                const fileId = await uploadFile(file);
                dirInfo.files.push({
                    type: FILE_TYPE.fileptr,
                    name: fileName,
                    original_path: filePath,
                    size: stat.size,
                    id: fileId
                });
            }
        })
    );

    const id = await uploadFile(JSON.stringify(dirInfo));

    logger.debug({dirPath: escape(dirPath)}, 'Successfully uploaded directory');

    return id;
};

const getFile = async (rawId, encoding = 'utf8', useCache = true) => {
    const id = (rawId.startsWith('0x') ? rawId.replace('0x', '') : rawId).toLowerCase();

    const filePath = path.join(filesDir, `file_${id}`);
    const file = await File.findByIdOrCreate(id, {original_path: filePath});
    if (useCache && file.dl_status === DOWNLOAD_UPLOAD_STATUS.COMPLETED) {
        logger.debug({fileId: file.id}, 'Returning file from cache');
        return await fs.readFile(filePath, {encoding});
    }
    if (file.dl_status === DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS) {
        logger.debug({fileId: file.id}, 'File download already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getFile(id, encoding); // use cache should be true in this case
    }

    logger.debug({fileId: file.id}, 'Downloading file');
    try {
        file.dl_status = DOWNLOAD_UPLOAD_STATUS.IN_PROGRESS;
        await file.save();

        logger.debug({fileId: file.id}, 'Getting info chunk');

        // TODO: retry logic
        const chunkInfo = await getChunk(file.id, encoding);
        const chunkInfoString = chunkInfo.toString();
        if (!chunkInfoString.startsWith(CHUNKINFO_PROLOGUE)) {
            logger.debug({fileId: file.id}, 'File consists of a single chunk, returning it');
            await fs.writeFile(filePath, chunkInfo);

            file.size = chunkInfo.length;
            file.dl_status = DOWNLOAD_UPLOAD_STATUS.COMPLETED;
            await file.save();

            return encoding === null ? chunkInfo : chunkInfo.toString(encoding);
        }

        logger.debug({fileId: file.id}, 'Processing chunk info');

        const {
            type,
            hash,
            chunks,
            filesize,
            merkle: merkleHash
        } = JSON.parse(chunkInfo.slice(CHUNKINFO_PROLOGUE.length + 1));

        if (type !== 'file') {
            throw new Error('Bad file type');
        }

        if (hash !== 'keccak256') {
            throw new Error('Bad hash type');
        }
        const merkleReassembled = merkle
            .merkle(
                chunks.map(x => Buffer.from(x, 'hex')),
                hashFn
            )
            .map(x => x.toString('hex'));
        if (!areScalarArraysEqual(merkleReassembled, merkleHash)) {
            throw new Error('Incorrect Merkle hash');
        }

        logger.debug({fileId: file.id}, 'Chunk info for file processed, getting chunks');

        // TODO: retry logic
        const chunkBuffers = await Promise.all(chunks.map(chunkId => getChunk(chunkId, encoding)));
        const fileBuffer = Buffer.concat([
            ...chunkBuffers.slice(0, -1),
            // We should trim the trailing zeros from the last chunk
            chunkBuffers[chunkBuffers.length - 1].slice(
                0,
                filesize - (chunkBuffers.length - 1) * config.get('storage.chunk_size_bytes')
            )
        ]);

        logger.debug({fileId: file.id}, 'Successfully proceeded file chunks');

        await fs.writeFile(filePath, fileBuffer);

        file.size = filesize;
        file.dl_status = DOWNLOAD_UPLOAD_STATUS.COMPLETED;
        await file.save();

        return encoding === null ? fileBuffer : fileBuffer.toString(encoding);
    } catch (e) {
        logger.error({fileId: file.id, message: e.message, stack: e.stack}, 'File download failed');
        file.dl_status = DOWNLOAD_UPLOAD_STATUS.FAILED;
        await file.save();
        throw e;
    }
};

const getJSON = async (id, useCache = true) => {
    logger.debug({id}, 'Getting JSON');
    const file = await getFile(id, 'utf8', useCache);
    return JSON.parse(file.toString('utf-8'));
};

const getFileIdByPath = async (dirId, filePath) => {
    const directory = await getJSON(dirId);
    const segments = filePath.split(/[/\\]/).filter(s => s !== '');
    const nextFileOrDir = directory.files.find(f => f.name === segments[0]);
    if (!nextFileOrDir) {
        throw new Error(`Failed to find file ${filePath} in directory ${dirId}: not found`);
    }
    if (segments.length === 1) {
        return nextFileOrDir.id;
    }
    if (nextFileOrDir.type === FILE_TYPE.fileptr) {
        throw new Error(
            `Failed to find file ${filePath} in directory ${dirId}: ${segments[0]} is not a directory`
        );
    } else {
        return getFileIdByPath(nextFileOrDir.id, path.join(...segments.slice(1)));
    }
};

module.exports = {
    DOWNLOAD_UPLOAD_STATUS,
    FILE_TYPE,
    init,
    getFile,
    getJSON,
    uploadFile,
    uploadDir,
    getFileIdByPath
};
