import handleRPC from './rpc-handlers';

describe('handleRPC', () => {
    it('should process an RPC request with a standard method', async () => {
        const body = {
            network: 'ynet',
            id: new Date().getTime(),
            method: 'eth_blockNumber'
        };

        const {status, result} = await handleRPC(body);
        expect(status).toBe(200);
        expect((result as {result: string}).result).toMatch(/^0x[0-9a-fA-F]+$/);
    });

    it('should process an RPC request with a non-standard method (Ethereum)', async () => {
        const body = {
            network: 'ynet',
            id: new Date().getTime(),
            method: 'eth_requestAccounts'
        };

        const {status, result} = await handleRPC(body);
        expect(status).toBe(200);
        expect((result as {result: string[]}).result[0]).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('should process an RPC request with a non-standard method (Solana)', async () => {
        const body = {
            network: 'solana_devnet',
            method: 'solana_requestAccount'
        };

        const {status, result} = await handleRPC(body);
        expect(status).toBe(200);
        expect((result as {result: {publicKey: string}}).result.publicKey).toMatch(
            /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
        );
    });

    it('should return 400 for request with unkown network', async () => {
        const body = {
            network: 'my-blockchain-implementation-that-does-not-exist-yet',
            id: new Date().getTime(),
            method: 'eth_accounts'
        };

        const {status} = await handleRPC(body);
        expect(status).toBe(400);
    });

    it('should process an RPC request (Solana)', async () => {
        const body = {
            network: 'solana_devnet',
            id: new Date().getTime(),
            method: 'getHealth'
        };

        const {status, result} = await handleRPC(body);
        expect(status).toBe(200);
        expect((result as {result: string}).result).toMatch('ok');
    });
});
