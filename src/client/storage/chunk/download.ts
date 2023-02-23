// TODO: add better error handling with custom errors and keeping error messages in DB
import Chunk, {CHUNK_DOWNLOAD_STATUS} from '../../../db/models/chunk';
import path from 'path';
import {existsSync, promises as fs} from 'fs';
import {hashFn} from '../../../util';
import {downloadChunk as downloadChunkFromBundler} from '../bundler';
import getDownloadQuery from '../query';
import {request} from 'graphql-request';
import {storage} from '../client/client';
import {
    BUNDLER_DOWNLOAD_URL,
    DOWNLOAD_CACHE_PATH,
    GATEWAY_URL,
    log
} from '../config';
import {EventTypes, waitForEvent} from '../callbacks';

const getChunk = async (
    chunkId: string,
    encoding: BufferEncoding|null = 'utf8',
    useCache = true
): Promise<Buffer | string> => {
    log.debug({chunkId}, 'Getting chunk');
    const chunk = await Chunk.findByIdOrCreate(chunkId);
    const chunkPath = path.join(DOWNLOAD_CACHE_PATH, `chunk_${chunkId}`);

    if (useCache && chunk.dl_status === CHUNK_DOWNLOAD_STATUS.COMPLETED) {
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

    // TODO: seems to work, but refactor this!!!
    // Due to issues with Arweave, we first try to retrieve
    // chunks from the bundler's backup (S3).
    try {
        log.debug({chunkId}, 'Downloading chunk from bundler backup');
        const buf = await downloadChunkFromBundler(BUNDLER_DOWNLOAD_URL, chunkId);

        const hash = hashFn(buf).toString('hex');
        if (hash !== chunk.id) {
            log.warn({chunkId, hash}, 'Chunk id and data do not match');
            throw new Error('Chunk id and data do not match');
        }

        await fs.writeFile(chunkPath, buf);
        chunk.size = buf.length;
        chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED;
        await chunk.save();
        return buf;
    } catch (err) {
        log.warn(
            {chunkId, message: err.message, stack: err.stack},
            'Chunk not found in bundler backup or hash doesn\'t match'
        );
    }
    const query = getDownloadQuery(chunkId);
    const queryResult = await request(GATEWAY_URL, query);
    const transactions = queryResult.transactions.edges;
    log.debug({chunkId, numberOfTxs: transactions.length}, 'Graphql request success');

    for (const edge of transactions) {
        const txid = edge.node.id;

        try {
            log.debug({chunkId}, 'Downloading chunk from Arweave cache');
            const {data} = await storage.getTxFromCache(txid);
            log.debug({chunkId, txid}, 'Successfully downloaded chunk from Arweave cache');
            const buf = Buffer.from(data);
            const hash = hashFn(buf).toString('hex');
            if (hash !== chunk.id) {
                log.warn({chunkId, hash}, 'Chunk id and data do not match');
                continue;
            }
            await fs.writeFile(chunkPath, buf);
            chunk.size = buf.length;
            chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED;
            await chunk.save();
            return buf;
        } catch (err) {
            log.warn({chunkId, txid, err}, 'Error fetching transaction data from Arweave cache');
        }

        try {
            log.debug({chunkId, txid}, 'Downloading chunk from Arweave node');
            const data = await storage.getDataByTxId(txid);
            log.warn({chunkId, txid}, 'Successfully downloaded chunk from Arweave node');
            const buf = Buffer.from(data);
            const hash = hashFn(buf).toString('hex');
            if (hash !== chunk.id) {
                log.warn({chunkId, hash}, 'Chunk id and data do not match');
                continue;
            }

            await fs.writeFile(chunkPath, buf);
            chunk.size = buf.length;
            chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED;
            await chunk.save();
            return buf;
        } catch (err) {
            log.warn({chunkId, err}, 'Error fetching transaction data from Arweave node');
        }
    }

    log.error({chunkId}, 'Chunk not found in backup, nor Arweave cache, nor Arweave node');
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
