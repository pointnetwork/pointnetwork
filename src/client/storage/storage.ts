import Arweave from 'arweave';
import config from 'config';

const arweave = Arweave.init({
    port: Number(config.get('storage.arweave_port')),
    protocol: config.get('storage.arweave_protocol'),
    host: config.get('storage.arweave_host'),
    timeout: config.get('storage.request_timeout')
});

export const storage = {
    getDataByTxId(txId: string) {
        return arweave.transactions.getData(txId, {decode: true});
    }
};