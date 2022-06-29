import {delay, hashFn} from '../../../util';
import Chunk, {CHUNK_UPLOAD_STATUS} from '../../../db/models/chunk';
import {promises as fs} from 'fs';
import path from 'path';
import arweave, {arweaveKey} from '../arweave/arweave_arlocal';
import {
    CONCURRENT_DOWNLOAD_DELAY,
    log,
    UPLOAD_CACHE_PATH,
    VERSION_MAJOR,
    VERSION_MINOR
} from '../config';
import Transaction from 'arweave/node/lib/transaction';

const signTx = async (data: Buffer, tags: Record<string, string>) => {
    // Real 'AR' mode

    const transaction = await arweave.createTransaction({data}, arweaveKey);

    for (const k in tags){
        const v = tags[k];
        transaction.addTag(k, v);
    }

    // Sign
    await arweave.transactions.sign(transaction, arweaveKey);

    return transaction;
};

const broadcastTx = async (transaction: Transaction) => {
    const uploader = await arweave.transactions.getUploader(transaction);
    while (!uploader.isComplete) { await uploader.uploadChunk(); }

    return transaction;
};

async function uploadArweave (data: Buffer, tags: Record<string, string>) {
    // upload to areweave directly without using bundler
    let transaction = await signTx(data, tags);
    transaction = await broadcastTx(transaction);
    const txid = transaction.id;
    log.debug({txid}, 'Transaction id successfully generated');
    return {data: {status: 'ok'}};
}

const uploadChunk = async (data: Buffer): Promise<string> => {
    const chunkId = hashFn(data).toString('hex');

    const chunk = await Chunk.findByIdOrCreate(chunkId);
    if (chunk.dl_status === CHUNK_UPLOAD_STATUS.COMPLETED) {
        log.debug({chunkId}, 'Chunk already exists, cancelling upload');
        return chunkId;
    }
    if (chunk.dl_status === CHUNK_UPLOAD_STATUS.IN_PROGRESS) {
        log.debug({chunkId}, 'Chunk upload already in progress, waiting');
        await delay(CONCURRENT_DOWNLOAD_DELAY);
        return uploadChunk(data);
    }

    log.debug({chunkId}, 'Starting chunk upload');
    try {
        chunk.dl_status = CHUNK_UPLOAD_STATUS.IN_PROGRESS;
        await chunk.save();

        const chunkIdVersioned = `__pn_chunk_${VERSION_MAJOR}.${VERSION_MINOR}_id`;

        const tags = {
            __pn_integration_version_major: VERSION_MAJOR,
            __pn_integration_version_minor: VERSION_MINOR,
            __pn_chunk_id: chunkId,
            [chunkIdVersioned]: chunkId
        };

        const response = await uploadArweave(data, tags);

        //TODO: check status from bundler
        if (response.data.status !== 'ok') {
            throw new Error(`Chunk ${chunkId} uploading failed: arweave endpoint error: ${
                JSON.stringify(response.data, null, 2)
            }`);
        }

        log.debug({chunkId}, 'Chunk successfully uploaded, saving to disk');

        await fs.writeFile(path.join(UPLOAD_CACHE_PATH, `chunk_${chunkId}`), data);
        chunk.dl_status = CHUNK_UPLOAD_STATUS.COMPLETED;
        chunk.size = data.length;
        await chunk.save();

        log.debug({chunkId}, 'Chunk successfully uploaded and saved');

        return chunkId;
    } catch (e) {
        log.error({chunkId, message: e.message, stack: e.stack}, 'Chunk upload failed');
        chunk.dl_status = CHUNK_UPLOAD_STATUS.FAILED;
        await chunk.save();
        throw e;
    }
};

export default uploadChunk;
