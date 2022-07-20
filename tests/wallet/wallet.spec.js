import {getBalance, getTransactions, sendTransaction} from '../../src/wallet';

describe.skip('Wallet', () => {
    it('Get eth balance', async () => {
        expect.assertions(1);
        const balance = await getBalance({majorUnits: true});
        expect(balance).toEqual(expect.any(Number));
    });

    it('Get solana balance', async () => {
        expect.assertions(1);
        const balance = await getBalance({network: 'solana_devnet', majorUnits: true});
        expect(balance).toEqual(expect.any(Number));
    });

    it('Send eth transaction', async () => {
        expect.assertions(1);
        const tx = await sendTransaction({
            to: '0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e',
            value: '0x5'
        });
        expect(tx.result.reqId).toEqual(expect.any(String));
    });

    it('Send solana transaction', async () => {
        expect.assertions(1);
        const tx = await sendTransaction({
            network: 'solana_devnet',
            to: 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg',
            value: '0x5'
        });
        expect(tx.result.reqId).toEqual(expect.any(String));
    });

    it('Get eth transactions', async () => {
        expect.assertions(1);
        const txs = await getTransactions({});
        expect(txs).toEqual(expect.any(Array));
    });

    // TODO: this is not working
    it('Get solana transactions', async () => {
        expect.assertions(1);
        const txs = await getTransactions({network: 'solana_devnet'});
        expect(txs).toEqual(expect.any(Array));
    });
});
