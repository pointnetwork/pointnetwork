import {PendingTxs} from './PendingTxs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const EXPIRATION_SECS = 1;
let pendingTxs = new PendingTxs(EXPIRATION_SECS);

beforeEach(() => {
    pendingTxs = new PendingTxs(EXPIRATION_SECS);
});

describe('PendingTxs', () => {
    it(`should add request to the pool and return it's ID`, () => {
        const tx = {method: 'eth_sendTransaction', params: [{value: 1}]};
        const reqId = pendingTxs.add(tx.params);
        expect(reqId).toBeTruthy();
    });

    it(`should find request by it's ID`, () => {
        // Add
        const tx = {method: 'eth_sendTransaction', params: [{value: 2}]};
        const id = pendingTxs.add(tx.params);

        // Retrieve
        const got = pendingTxs.find(id);
        expect(got?.params).toEqual(tx.params);
    });

    it(`should delete a request by it's ID`, () => {
        // Add
        const tx = {method: 'eth_sendTransaction', params: [{value: 3}]};
        const id = pendingTxs.add(tx.params);

        // Remove
        const got = pendingTxs.rm(id);
        expect(got).toEqual(id);
        expect(pendingTxs.find(id)).toBeUndefined();
    });

    it(`should delete a stale request`, async () => {
        // Add
        const tx = {method: 'eth_sendTransaction', params: [{value: 4}]};
        const id = pendingTxs.add(tx.params);

        // Retrieve (after expiration)
        await sleep((EXPIRATION_SECS + 0.5) * 1000);
        const got = pendingTxs.find(id);
        expect(got).toBeUndefined();
    });

    it('should retrieve a request that has not expire yet', async () => {
        // Add
        const tx = {method: 'eth_sendTransaction', params: [{value: 5}]};
        const id = pendingTxs.add(tx.params);

        // Retrieve (before expiration)
        await sleep((EXPIRATION_SECS - 0.5) * 1000);
        const got = pendingTxs.find(id);
        expect(got?.params).toEqual(tx.params);
    });
});
