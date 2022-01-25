const File = require( "../../db/models/file.js");
const Chunk = require("../../db/models/chunk.js");
const {gql, request} = require("graphql-request");
const utils = require("#utils");
const Arweave = require("arweave");
const {promises: fs} = require("fs");
const path = require("path");

const DOWNLOAD_STATUS = {
    NOT_STARTED: "NOT_STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED"
};

const CHUNKINFO_PROLOGUE = "PN^CHUNK\x05$\x06z\xf5*INFO";
const CONCURRENT_DOWNLOAD_DELAY = 100;
// TODO: move to some new utils file
const delay = ms => new Promise(resolve => {setTimeout(resolve, ms);});
const makeSurePathExists = async folderPath => {
    try {
        await fs.stat(folderPath);
    } catch (e) {
        if (e.code === "ENOENT") {
            await fs.mkdir(folderPath, {recursive: true});
        } else {
            throw e;
        }
    }
};

// TODO: get rid of this and read config directly.
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
        makeSurePathExists(cacheDir),
        makeSurePathExists(filesDir)
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
        // TODO: move to separate file
        const query = gql`{
                                transactions(
                                    tags: [
                                        {
                                            name: "__pn_chunk_${config.arweave_experiment_version_major}.${config.arweave_experiment_version_minor}_id",
                                            values: ["${chunk.id}"]
                                        }
                                    ]
                                ) {
                                    edges {
                                        node {
                                            id
                                        }
                                    }
                                }
                            }
        `;
        const queryResult = await request('https://arweave.net/graphql', query);
        logger.debug(`Graphql request success for chunk ${chunk.id}`);
        
        for (let edge of queryResult.transactions.edges) {
            const txid = edge.node.id;
            logger.debug(`Downloading data from arweave, chunk id: ${chunk.id}, txid: ${txid}`);

            const data = await arweave.transactions.getData(txid, {decode: true});
            logger.debug(`Successfully downloaded data from arweave, chunk id: ${chunk.id}, txid: ${txid}`);

            const buf = Buffer.from(data);

            // todo: remove this util
            const hash = utils.hashFnHex(buf);
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
            merkle
        } = JSON.parse(chunkInfo.slice(CHUNKINFO_PROLOGUE.length + 1));

        if (type !== 'file') {
            throw new Error('Bad file type');
        }

        if (hash !== 'keccak256') {
            throw new Error("Bad hash type");
        }
        const merkleReassembled = utils.merkle
            .merkle(chunks.map(x => Buffer.from(x, 'hex')), utils.hashFn)
            .map(x => x.toString('hex'));
        if (!utils.areScalarArraysEqual(merkleReassembled, merkle)) {
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

module.exports = {
    DOWNLOAD_STATUS,
    init,
    getFile,
    getJSON
};
