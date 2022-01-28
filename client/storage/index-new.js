const File = require( "../../db/models/file.js");
const Chunk = require("../../db/models/chunk.js");
const {request, gql} = require("graphql-request");
const {
    hashFn,
    merkle,
    makeSurePathExistsAsync,
    delay,
    areScalarArraysEqual,
    escape
} = require("#utils");
const Arweave = require("arweave");
const {promises: fs} = require("fs");
const path = require("path");
const FormData = require('form-data');
const axios = require("axios");

// TODO: for some reason docker fails to resolve module if I move it to another file
const getDownloadQuery = (chunkId, majorVersion, minorVersion) =>
    gql`{
      transactions(
        tags: [
          {
            name: "__pn_chunk_${majorVersion}.${minorVersion}_id",
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

const DOWNLOAD_STATUS = {
    NOT_STARTED: "NOT_STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
};

const CHUNKINFO_PROLOGUE = "PN^CHUNK\x05$\x06z\xf5*INFO";
const CONCURRENT_DOWNLOAD_DELAY = 100;

// TODO: get rid of this and read config directly.
// TODO: possibly split this file into several ones after refactoring config
let config;
let logger;
let cacheDir;
let filesDir;
const init = async ctx => {
    // TODO: ambiguous stuff, config is spread between storage and client.storage
    config = {
        ...ctx.config.storage,
        ...ctx.config.client.storage
    };
    if (!config.arweave_experiment_version_major) {
        throw new Error('arweave_experiment_version_major not set or is 0');
    }
    if (!config.arweave_experiment_version_minor) {
        throw new Error('arweave_experiment_version_minor not set or is 0');
    }
    logger = ctx.log;
    cacheDir = path.join(ctx.datadir, ctx.config.client.storage.cache_path);
    // TODO: this should also come from config, but we don't have such a property
    filesDir = path.join(ctx.datadir, "files");
    await Promise.all([
        makeSurePathExistsAsync(cacheDir),
        makeSurePathExistsAsync(filesDir)
    ]);
};

const arweave = Arweave.init({
    port: 443,
    protocol: 'https',
    host: 'arweave.net'
});

const getChunk = async (chunkId, encoding = "utf8", useCache = true) => {
    const chunk = await Chunk.findByIdOrCreate(chunkId);
    const chunkPath = path.join(cacheDir, `chunk_${chunkId}`);

    if (useCache && chunk.dl_status === DOWNLOAD_STATUS.COMPLETED) {
        logger.debug(`Returning chunk ${chunkId} from cache`);
        return fs.readFile(chunkPath, {encoding});
    }
    if (chunk.dl_status === DOWNLOAD_STATUS.IN_PROGRESS) {
        logger.debug(`Chunk ${chunkId} download already in progress, waiting`);
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getChunk(chunkId, encoding); // use cache should be true in this case
    }

    logger.debug(`Downloading chunk ${chunk.id}`);
    chunk.dl_status = DOWNLOAD_STATUS.IN_PROGRESS;
    await chunk.save();

    try {
        const query = getDownloadQuery(
            chunkId,
            config.arweave_experiment_version_major,
            config.arweave_experiment_version_minor
        );

        const queryResult = await request('https://arweave.net/graphql', query);
        logger.debug(`Graphql request success for chunk ${chunk.id}`);
        
        for (let edge of queryResult.transactions.edges) {
            const txid = edge.node.id;
            logger.debug(`Downloading data from arweave, chunk id: ${chunk.id}, txid: ${txid}`);

            const data = await arweave.transactions.getData(txid, {decode: true});
            logger.debug(`Successfully downloaded data from arweave, chunk id: ${chunk.id}, txid: ${txid}`);

            const buf = Buffer.from(data);

            const hash = hashFn(buf).toString('hex');
            if (hash !== chunk.id) {
                logger.warn(`Chunk id and data do not match, chunk id: ${chunk.id}, hash: ${hash}`);
                continue;
            }

            await fs.writeFile(chunkPath, buf);

            chunk.size = buf.length;
            chunk.dl_status = DOWNLOAD_STATUS.COMPLETED;
            await chunk.save();
            return buf;
        }

        throw new Error("No mathing hash found in arweave");
    } catch (e) {
        logger.error(`Chunk download failed, chunk id: ${chunk.id}`);
        logger.error(e);
        chunk.dl_status = DOWNLOAD_STATUS.FAILED;
        await chunk.save();
        throw e;
    }
};

const uploadChunk = async data => {
    const id = hashFn(data).toString('hex');

    const chunk = await Chunk.findByIdOrCreate(id);
    if (chunk.dl_status === DOWNLOAD_STATUS.COMPLETED) {
        logger.debug(`Chunk ${id} already exists, cancelling upload`);
        return id;
    }

    logger.debug(`Starting chunk upload: ${id}`);

    const formData = new FormData();
    formData.append("file", data);
    formData.append("__pn_integration_version_major", config.arweave_experiment_version_major);
    formData.append("__pn_integration_version_minor", config.arweave_experiment_version_minor);
    formData.append("__pn_chunk_id", id);
    formData.append(
        `__pn_chunk_${config.arweave_experiment_version_major}.${config.arweave_experiment_version_minor}_id`,
        id
    );

    const response = await axios.post(
        `${config.arweave_airdrop_endpoint}/signPOST`,
        formData,
        {
            headers: {
                ...formData.getHeaders()
            }
        }
    );

    if (response.data.status !== 'ok') {
        throw new Error(`Chunk ${id} uploading failed: arweave airdrop endpoint error: ${
            JSON.stringify(response, null , 2)}`);
    }

    logger.debug(`Chunk ${id} successfully uploaded, saving to disk`);

    await fs.writeFile(path.join(cacheDir, `chunk_${id}`), data);
    chunk.dl_status = DOWNLOAD_STATUS.COMPLETED;
    chunk.size = data.length;
    await chunk.save();

    logger.debug(`Chunk ${id} successfully uploaded and saved`);

    return id;
};

const uploadFile = async data => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);

    const CHUNK_SIZE = config.chunk_size_bytes;
    const totalChunks = Math.ceil(buf.length / CHUNK_SIZE);

    if (totalChunks === 1) {
        const id = hashFn(buf).toString('hex');
        logger.debug(`File ${id} consists only from 1 chunk, uploading`);

        const filePath = path.join(filesDir, `file_${id}`);
        const file = await File.findByIdOrCreate(id, {original_path: filePath});
        if (file.dl_status === DOWNLOAD_STATUS.COMPLETED) {
            logger.debug(`File ${id} already exists, cancelling upload`);
            return id;
        }

        const chunkId = await uploadChunk(buf);
        if (chunkId !== id) {
            throw new Error(`Unexpected different ids for file and it's only chunk: ${id}, ${chunkId}`);
        }

        await fs.writeFile(filePath, buf);
        file.size = buf.length;
        file.dl_status = DOWNLOAD_STATUS.COMPLETED;
        await file.save();

        logger.debug(`File ${id} successfully uploaded`);

        return id;
    }

    const chunks = [];
    for (let i=0; i<totalChunks; i++) {
        chunks.push(buf.slice(i * CHUNK_SIZE, (i+1) * CHUNK_SIZE));
    }

    // TODO: retry logic
    const chunkIds = await Promise.all(chunks.map(chunk => uploadChunk(chunk)));

    const merkleTree = merkle.merkle(chunkIds.map(x => Buffer.from(x, 'hex')), hashFn);
    const chunkInfoContents = CHUNKINFO_PROLOGUE + JSON.stringify({
        type: 'file',
        chunks: chunkIds,
        hash: 'keccak256',
        filesize: buf.length,
        merkle: merkleTree.map(x => x.toString('hex')),
    });
    const chunkInfoBuffer = Buffer.from(chunkInfoContents, 'utf-8');
    const id = await uploadChunk(chunkInfoBuffer);

    logger.debug(`Successfully chunkified file ${id}`);

    const filePath = path.join(filesDir, `file_${id}`);
    const file = await File.findByIdOrCreate(id, {original_path: filePath});
    if (file.dl_status === DOWNLOAD_STATUS.COMPLETED) {
        logger.debug(`File ${id} already exists, not rewriting`);
        return id;
    }

    logger.debug(`File ${id} successfully uploaded, saving to disk`);

    await fs.writeFile(filePath, buf);
    file.size = buf.length;
    file.dl_status = DOWNLOAD_STATUS.COMPLETED;
    await file.save();
    
    logger.debug(`File ${id} successfully uploaded and saved`);
    return id;
};

const uploadDir = async dirPath => {
    try {
        const stat = await fs.stat(dirPath);
        const isDir = stat.isDirectory();
        if (!isDir) {
            throw new Error(`Path ${escape(dirPath)} is not a directory`);
        }
    } catch (e) {
        if (e.code === "ENOENT") {
            throw new Error(`Directory ${escape(dirPath)} does not exist`);
        }
        throw e;
    }

    logger.debug(`Uploading directory ${escape(dirPath)}`);

    const files = await fs.readdir(dirPath);
    const dirInfo = {
        type: "dir",
        files: []
    };

    await Promise.all(files.map(async fileName => {
        const filePath = path.join(dirPath, fileName);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
            const dirId = await uploadDir(filePath);
            dirInfo.files.push({
                type: 'dirptr',
                name: fileName,
                original_path: filePath,
                size: stat.size,
                id: dirId
            });
        } else {
            const file = await fs.readFile(filePath);
            const fileId = await uploadFile(file);
            dirInfo.files.push({
                type: 'fileptr',
                name: fileName,
                original_path: filePath,
                size: stat.size,
                id: fileId
            });
        }
    }));

    const id = await uploadFile(JSON.stringify(dirInfo));

    logger.debug(`Successfully uploaded directory ${escape(dirPath)}`);

    return id;
};

const getFile = async (rawId, encoding = "utf8", useCache = true) => {
    const id = (rawId.startsWith("0x") ? rawId.replace("0x", "") : rawId).toLowerCase();

    const filePath = path.join(filesDir, `file_${id}`);
    const file = (await File.findByIdOrCreate(id, { original_path: filePath }));
    if (useCache && file.dl_status === DOWNLOAD_STATUS.COMPLETED) {
        logger.debug(`Returning file ${file.id} from cache`);
        return (await fs.readFile(filePath, {encoding}));
    }
    if (file.dl_status === DOWNLOAD_STATUS.IN_PROGRESS) {
        logger.debug(`File ${file.id} download already in progress, waiting`);
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getFile(id, encoding); // use cache should be true in this case
    }

    logger.debug(`Downloading file ${file.id}`);
    try {
        file.dl_status = DOWNLOAD_STATUS.IN_PROGRESS;
        await file.save();

        logger.debug(`Getting info chunk, file id: ${file.id}`);

        // TODO: retry logic
        const chunkInfo = await getChunk(file.id, encoding);
        const chunkInfoString = chunkInfo.toString();
        if (!chunkInfoString.startsWith(CHUNKINFO_PROLOGUE)) {
            logger.debug(`File ${file.id} consists of a single chunk, returning it`);
            await fs.writeFile(filePath, chunkInfo);

            file.size = chunkInfo.length;
            file.dl_status = DOWNLOAD_STATUS.COMPLETED;
            await file.save();

            return encoding === null ? chunkInfo : chunkInfo.toString(encoding);
        }

        logger.debug(`Processing chunk info, file id: ${file.id}`);

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
            throw new Error("Bad hash type");
        }
        const merkleReassembled = merkle
            .merkle(chunks.map(x => Buffer.from(x, 'hex')), hashFn)
            .map(x => x.toString('hex'));
        if (!areScalarArraysEqual(merkleReassembled, merkleHash)) {
            throw new Error("Incorrect Merkle hash");
        }

        logger.debug(`Chunk info for file id ${file.id} processed, getting chunks`);

        // TODO: retry logic
        const chunkBuffers = (await Promise.all(chunks.map(chunkId => getChunk(chunkId, encoding))));
        const fileBuffer = Buffer.concat([
            ...chunkBuffers.slice(0, -1),
            // We should trim the trailing zeros from the last chunk
            chunkBuffers[chunkBuffers.length - 1]
                .slice(0, filesize - ((chunkBuffers.length - 1) * config.chunk_size_bytes))
        ]);
        
        logger.debug(`Successfully proceeded file chunks, file id: ${file.id}`);

        await fs.writeFile(filePath, fileBuffer);

        file.size = filesize;
        file.dl_status = DOWNLOAD_STATUS.COMPLETED;
        await file.save();

        return encoding === null ? fileBuffer : fileBuffer.toString(encoding);
    } catch (e) {
        logger.error(`File download failed, file id: ${file.id}`);
        logger.error(e.stack);
        file.dl_status = DOWNLOAD_STATUS.FAILED;
        await file.save();
        throw e;
    }
};

const getJSON = async (id, useCache = true) => {
    logger.debug(`Getting JSON ${id}`);
    const file = await getFile(id, "utf8", useCache);
    return JSON.parse(file.toString("utf-8"));
};

const getFileIdByPath = async (dirId, filePath) => {
    const directory = await getJSON(dirId);
    const segments = filePath.split(/[/\\]/).filter(s => s !== "");
    const nextFileOrDir = directory.files.find(f => f.name === segments[0]);
    if (!nextFileOrDir) {
        throw new Error(`Failed to find file ${filePath} in directory ${dirId}: not found`);
    }
    if (segments.length === 1) {
        return nextFileOrDir.id;
    }
    if (nextFileOrDir.type === "fileptr") {
        throw new Error(`Failed to find file ${filePath} in directory ${dirId}: ${segments[0]} is not a directory`);
    } else {
        return getFileIdByPath(nextFileOrDir.id, path.join(...segments.slice(1)));
    }
};

module.exports = {
    DOWNLOAD_STATUS,
    init,
    getFile,
    getJSON,
    uploadFile,
    uploadDir,
    getFileIdByPath
};
