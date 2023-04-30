import Arweave from 'arweave';
import {HOST, PORT, PROTOCOL, TIMEOUT} from '../config.js';
import {ResponseWithData} from 'arweave/node/lib/api';

const arweave = Arweave.init({
    port: PORT,
    protocol: PROTOCOL,
    host: HOST,
    timeout: TIMEOUT
});

export const storage: {
    getDataByTxId(txId: string): Promise<string | Uint8Array>;
    getTxFromCache(txId: string): Promise<ResponseWithData<Uint8Array>>;
} = {
    getDataByTxId(txId: string) {
        return arweave.transactions.getData(txId, {decode: true});
    },
    getTxFromCache(txId: string) {
        return arweave.api.get<Uint8Array>(`/${txId}`, {responseType: 'arraybuffer'});
    }
};
