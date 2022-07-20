import {JsonRpcResponse} from 'hardhat/types';
import {Provider, ChainId} from '../blockchain-provider';
import {DomainRegistry} from '../../../name_service/types';
import {RPCRequest} from '../../../rpc/rpc-handlers';

class MockEthereumProvider implements Provider {
    private static instance: MockEthereumProvider;

    public static getInstance() {
        if (!MockEthereumProvider.instance) {
            MockEthereumProvider.instance = new MockEthereumProvider();
        }
        return MockEthereumProvider.instance;
    }

    public name(chainId: ChainId): string {
        return `EthereumProvider (chain: ${chainId})`;
    }

    public async resolveDomain(chainId: ChainId, domainName: string): Promise<DomainRegistry> {
        return {
            owner: `mocked-owner-for-domain-${domainName}-in-${chainId}`,
            content: `mocked-content-for-domain-${domainName}-in-${chainId}`
        };
    }

    public async setDomainContent(
        chainId: ChainId,
        domainName: string,
        data: string
    ): Promise<Record<string, string | number | boolean>> {
        return {
            txId: 'mocked-transaction',
            mock: true,
            chainId,
            domainName,
            receivedData: data
        };
    }

    public async send(chainId: ChainId, data: RPCRequest): Promise<JsonRpcResponse> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: any;
        switch (data.method) {
            case 'eth_accounts':
                result = ['0xF5277b8B7a620f1E04a4a205A6e552D084BBf76B'];
                break;
            case 'eth_blockNumber':
                result = '0x1';
                break;
            default:
                result = {mock: true, chainId, receivedData: data};
        }

        return {
            jsonrpc: '2.0',
            id: data.id || -1,
            result
        };
    }

    public async sendTransaction(
        chainId: ChainId,
        reqId: number,
        txParams: unknown[]
    ): Promise<JsonRpcResponse> {
        return {
            jsonrpc: '2.0',
            id: reqId,
            result: {
                mock: true,
                chainId,
                receivedData: txParams
            }
        };
    }

    public async requestAccounts(chainId: ChainId, id: number): Promise<JsonRpcResponse> {
        return {
            jsonrpc: '2.0',
            id,
            result: {
                mock: true,
                chainId,
                accounts: ['mocked-account']
            }
        };
    }

    public async getBlockNumber(_: ChainId): Promise<number> {
        return -1;
    }
}

export default MockEthereumProvider;
