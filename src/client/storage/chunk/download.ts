// TODO: add better error handling with custom errors and keeping error messages in DB
import Chunk, {CHUNK_DOWNLOAD_STATUS, CHUNK_UPLOAD_STATUS} from '../../../db/models/chunk.js';
import path from 'path';
import {existsSync, promises as fs} from 'fs';
import {hashFn} from '../../../util/index.js';
import {downloadChunk as downloadChunkFromBundler} from '../bundler.js';
import getDownloadQuery from '../query.js';
import {request} from 'graphql-request';
import {storage} from '../client/client.js';
import {
    ARWEAVE_BUNDLERS_READ,
    DOWNLOAD_CACHE_PATH,
    GATEWAY_URL,
    log
} from '../config.js';
import {EventTypes, waitForEvent} from '../callbacks.js';

const validateIntegrity = (chunkId: string, data: Buffer): boolean => {
    const hash = hashFn(data).toString('hex');
    return hash === chunkId;
};

const sourceBundlerBackup = async (bundler_url: string, chunkId: string): Promise<Buffer> =>
    await downloadChunkFromBundler(bundler_url, chunkId);

const getTxIdsByChunkIdFromGraphQL = async (chunkId: string): Promise<string[]> => {
    const query = getDownloadQuery(chunkId);
    const queryResult = await request(GATEWAY_URL, query);
    const transactions = queryResult.transactions.edges;
    log.debug({chunkId, numberOfTxs: transactions.length}, 'Graphql request success');

    const txids = [];
    for (const edge of transactions) {
        const txid = edge.node.id;
        txids.push(txid);
    }

    return txids;
};

const sourceArweaveGateway = async (chunkId: string): Promise<Buffer> => {
    const txids = await getTxIdsByChunkIdFromGraphQL(chunkId);

    //for (const edge of transactions) {
    for (const txid of txids) {
        try {
            log.debug({chunkId}, 'Downloading chunk from Arweave gateway');
            const {data} = await storage.getTxFromCache(txid);

            log.debug({chunkId, txid}, 'Successfully downloaded chunk from Arweave gateway, verifying');
            const buf = Buffer.from(data);
            if (!validateIntegrity(chunkId, buf)) {
                continue;
            }

            // Success!
            return buf;

        } catch (e) {
            // continue to next tx
        }
    }

    throw new Error('No transactions for this chunk found in Arweave gateway');
};

const sourceArweaveNetwork = async (chunkId: string): Promise<Buffer> => {
    const txids = await getTxIdsByChunkIdFromGraphQL(chunkId);

    for (const txid of txids) {
        try {
            log.debug({chunkId, txid}, 'Downloading chunk from Arweave node');
            const data = await storage.getDataByTxId(txid);

            log.warn({chunkId, txid}, 'Successfully downloaded chunk from Arweave node, verifying');
            const buf = Buffer.from(data);
            if (!validateIntegrity(chunkId, buf)) {
                continue;
            }

            // Success!
            return buf;

        } catch (err) {
            // Continue to the next tx
        }
    }

    throw new Error('No transactions for this chunk found in Arweave node');
};

const getChunk = async (
    chunkId: string,
    encoding: BufferEncoding|null = 'utf8',
    useCache = true
): Promise<Buffer | string> => {
    log.debug({chunkId}, 'Getting chunk');
    const chunk = await Chunk.findByIdOrCreate(chunkId);
    const chunkPath = path.join(DOWNLOAD_CACHE_PATH, `chunk_${chunkId}`);

    if (useCache && (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.COMPLETED)) {
        log.debug({chunkId}, 'Returning chunk from cache');
        if (existsSync(chunkPath)) {
            return await fs.readFile(chunkPath, {encoding});
        }
        log.warn({chunkId}, 'Chunk marked as downloaded, but is missing on the disk');
    }
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.trace({chunkId}, 'Chunk download already in progress, waiting');
        return await waitForEvent(
            EventTypes.CHUNK_DOWNLOAD_STATUS_CHANGED,
            chunk.id,
            getChunk.bind(null, chunkId, encoding)
        );
    }

    chunk.dl_status = CHUNK_DOWNLOAD_STATUS.IN_PROGRESS;
    await chunk.save();

    const sources = [
        ...ARWEAVE_BUNDLERS_READ.map((bundler_url: string) => sourceBundlerBackup.bind(null, bundler_url)),
        sourceArweaveGateway,
        sourceArweaveNetwork
    ];

    for (const source of sources) {
        log.debug({chunkId}, 'Downloading chunk from source: ' + source.name);

        try {
            // attempt download
            const buf = await source(chunkId);

            // verify hash
            if (!validateIntegrity(chunkId, buf)) {
                log.warn({chunkId, hash: hashFn(buf).toString('hex')}, 'Chunk hash does not match');
                throw new Error('Chunk id and data do not match');
            }

            // save to disk
            await fs.writeFile(chunkPath, buf);

            // update chunk
            chunk.size = buf.byteLength;
            chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED;
            chunk.ul_status = CHUNK_UPLOAD_STATUS.COMPLETED; // if we could fetch it, it's on the network
            await chunk.save();

            return buf;

        } catch (err) {
            // Continue to the next source
        }
    }

    // If we're here, we failed to download the chunk
    log.error({chunkId}, 'Chunk not found in backup, nor Arweave gateway, nor Arweave node');
    chunk.dl_status = CHUNK_DOWNLOAD_STATUS.FAILED;
    await chunk.save();
    throw new Error('Chunk not found');
};

export const getChunkBinary = async (chunkId: string): Promise<Buffer> => {
    const buf = await getChunk(chunkId, null);
    if (!Buffer.isBuffer(buf)) {
        throw new Error('Expected buffer, this should never happen');
    }
    return buf;
};

export default getChunk;
