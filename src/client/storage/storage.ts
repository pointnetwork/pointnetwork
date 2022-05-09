import Arweave from 'arweave';
import config from 'config';
import {AxiosResponse} from 'axios';
import {request} from 'graphql-request';
import getDownloadQuery from './query';

const arweave = Arweave.init({
    port: Number(config.get('storage.arweave_port')),
    protocol: config.get('storage.arweave_protocol'),
    host: config.get('storage.arweave_host'),
    timeout: config.get('storage.request_timeout')
});

/**
 * Get transaction data from Arweave node.
 */
export function getDataByTxId(txId: string): Promise<string | Uint8Array> {
    return arweave.transactions.getData(txId, {decode: true});
}

/**
 * Get transaction data from Arweave cache.
 */
export function getTxFromCache(txId: string): Promise<AxiosResponse<Uint8Array>> {
    return arweave.api.get(`/${txId}`, {responseType: 'arraybuffer'});
}

/**
 * Finds all Arweave transactions for a given chunkId
 * _Ideally, there should only be 1 transaction per chunkId, but it is not guaranteed._
 */
export async function getTransactionsByChunkId(chunkId: string) {
    const query = getDownloadQuery(chunkId);
    const queryResult = await request(config.get('storage.arweave_gateway_url'), query);
    return queryResult.transactions.edges;
}
