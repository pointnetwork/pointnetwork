import {JsonRpcResponse} from 'hardhat/types';
import {Provider, ChainId} from '../blockchain-provider';
import {DomainRegistry} from '../../../name_service/types';
import {RPCRequest} from '../../../rpc/rpc-handlers';

class MockSolanaProvider implements Provider {
    private static instance: MockSolanaProvider;

    public static getInstance() {
        if (!MockSolanaProvider.instance) {
            MockSolanaProvider.instance = new MockSolanaProvider();
        }
        return MockSolanaProvider.instance;
    }

    public name(chainId: ChainId): string {
        return `SolanaProvider (chain: ${chainId})`;
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
            case 'getBlockHeight':
                result = 0;
                break;
            case 'getHealth':
                result = 'ok';
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
                publicKey: '9LpfJjRJ66DkfmpPJwb9RDmixCxCeqG4c41GKNAU8UpS'
            }
        };
    }
}

export default MockSolanaProvider;
