import {blockchain, ChainId} from './provider';

describe('BlockchainProvider', () => {
    it('should return correct name for EthereumMainnet', () => {
        const chainId = ChainId.EthereumMainnet;
        const name = blockchain.name(chainId);
        expect(name).toBe(`EthereumProvider (chain: ${chainId})`);
    });

    it('should return correct name for PointYnet', () => {
        const chainId = ChainId.PointYnet;
        const name = blockchain.name(chainId);
        expect(name).toBe(`EthereumProvider (chain: ${chainId})`);
    });

    it('should return correct name for SolanaDevnet', () => {
        const chainId = ChainId.SolanaDevnet;
        const name = blockchain.name(chainId);
        expect(name).toBe(`SolanaProvider (chain: ${chainId})`);
    });

    // We can only test .sol domains with Mainnet, disabled for now.
    // it('should return correct Domain Registry for .sol domain (Mainnet)', async () => {
    //     const registry = await blockchain.resolveDomain(ChainId.SolanaMainnet, 'bonfida.sol');
    //     expect(registry.owner).toBe('FidaeBkZkvDqi1GXNEwB8uWmj9Ngx2HXSS5nyGRuVFcZ');
    // });

    // We are hitting usage limits on Infura to connect to Rinkeby, disabled for now.
    // it('should return correct Domain Registry for .eth domain (Rinkeby)', async () => {
    //     const registry = await blockchain.resolveDomain(ChainId.EthereumRinkeby, 'germandv.eth');
    //     expect(registry.owner).toBe('0x966841B05625DCAB18760dE68E0dbB12c88Fa0aE');
    // }, 15 * 1000);

    it('should return a block number for provider that implements getBlockNumber', async () => {
        const n = await blockchain.getBlockNumber(ChainId.PointYnet);
        expect(typeof n).toBe('number');
    });

    it('should throw when calling a method not implemented by a provider', () => {
        const e = 'Method getBlockNumber not implemented by SolanaProvider (chain: devnet)';
        const wantErr = new Error(e);
        expect(blockchain.getBlockNumber(ChainId.SolanaDevnet)).rejects.toThrow(wantErr);
    });

    it('should get expected response from an RPC call to the ethereum provider', async () => {
        const id = new Date().getTime();
        const rpcReq = {id, network: 'ynet', method: 'eth_accounts'};
        const resp = await blockchain.send(ChainId.PointYnet, rpcReq);
        expect(resp.id).toBe(id);
        expect(resp.result[0]).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it('should get expected response from an RPC call to the ethereum provider', async () => {
        const id = new Date().getTime();
        const rpcReq = {id, network: 'solana_devnet', method: 'getBlockHeight'};
        const resp = await blockchain.send(ChainId.SolanaDevnet, rpcReq);
        expect(resp.id).toBe(id);
        expect(typeof resp.result).toBe('number');
    });
});
