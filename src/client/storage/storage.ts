import Arweave from 'arweave';
import config from 'config';
import {AxiosResponse} from 'axios';

const arweave = Arweave.init({
    port: Number(config.get('storage.arweave_port')),
    protocol: config.get('storage.arweave_protocol'),
    host: config.get('storage.arweave_host'),
    timeout: config.get('storage.request_timeout')
});

export const storage: {
    getDataByTxId(txId: string): Promise<string | Uint8Array>;
    getTxFromCache(txId: string): Promise<AxiosResponse<Uint8Array>>;
} = {
    getDataByTxId(txId: string) {
        return arweave.transactions.getData(txId, {decode: true});
    },
    getTxFromCache(txId: string) {
        return arweave.api.get(`/${txId}`, {responseType: 'arraybuffer'});
    }
};
