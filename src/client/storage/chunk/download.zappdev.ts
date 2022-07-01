import Chunk, {CHUNK_DOWNLOAD_STATUS} from '../../../db/models/chunk';
import path from 'path';
import {promises as fs} from 'fs';
import {delay, hashFn} from '../../../util';
import {request} from 'graphql-request';
import axios from 'axios';
import {
    CONCURRENT_DOWNLOAD_DELAY,
    DOWNLOAD_CACHE_PATH,
    GATEWAY_URL,
    HOST,
    log,
    PORT
} from '../config';
import getDownloadQuery from '../query';

const getChunk = async (
    chunkId: string,
    encoding: BufferEncoding = 'utf8',
    useCache = true
): Promise<Buffer | string> => {
    const chunk = await Chunk.findByIdOrCreate(chunkId);
    const chunkPath = path.join(DOWNLOAD_CACHE_PATH, `chunk_${chunkId}`);

    if (useCache && chunk.dl_status === CHUNK_DOWNLOAD_STATUS.COMPLETED) {
        log.debug({chunkId}, 'Returning chunk from cache');
        return fs.readFile(chunkPath, {encoding});
    }
    if (chunk.dl_status === CHUNK_DOWNLOAD_STATUS.IN_PROGRESS) {
        log.debug({chunkId}, 'Chunk download already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return getChunk(chunkId, encoding); // use cache should be true in this case
    }

    log.debug({chunkId}, 'Downloading chunk');
    try {
        chunk.dl_status = CHUNK_DOWNLOAD_STATUS.IN_PROGRESS;
        await chunk.save();

        const query = getDownloadQuery(chunkId);

        const queryResult = await request(GATEWAY_URL, query);
        log.debug({chunkId}, 'Graphql request success');

        for (const edge of queryResult.transactions.edges) {
            const txid = edge.node.id;
            log.debug({chunkId, txid}, 'Downloading data from arweave');

            // TODO: Remove the axios hack below when this bug of arlocal is resolved.
            // https://github.com/textury/arlocal/issues/63
            // It is fixed, but don't seems to work in all cases.
            const data = (await axios.get('http://' +  HOST +
                ':' + PORT + '/tx/' +  txid + '/data')).data;
            const buf = Buffer.from(data, 'base64');

            /*
            // NOTE: above code can be replaced with below when mentioned arlocal bug is resolved
            // It works in sms.point, but brokes in pointsocial.point, for example.
            const data = await arweave.transactions.getData(txid, {decode: true});
            const buf = Buffer.from(data);
            */

            log.debug({chunkId, txid}, 'Successfully downloaded data from arweave');

            const hash = hashFn(buf).toString('hex');
            if (hash !== chunk.id) {
                log.warn(
                    {chunkId, hash, query, buf: buf.toString()},
                    'Chunk id and data do not match'
                );
                continue;
            }

            await fs.writeFile(chunkPath, buf);

            chunk.size = buf.length;
            chunk.dl_status = CHUNK_DOWNLOAD_STATUS.COMPLETED;
            await chunk.save();
            return buf;
        }

        throw new Error('No matching hash found in arweave');
    } catch (e) {
        log.error({chunkId, message: e.message, stack: e.stack}, 'Chunk download failed');
        chunk.dl_status = CHUNK_DOWNLOAD_STATUS.FAILED;
        await chunk.save();
        throw e;
    }
};

export default getChunk;
