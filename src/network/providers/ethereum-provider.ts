import {ethers} from 'ethers';
import Web3 from 'web3';
import {HttpProvider} from 'web3-providers-http';
import HDWalletProvider from '@truffle/hdwallet-provider';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import NonceTrackerSubprovider from 'web3-provider-engine/subproviders/nonce-tracker';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import namehash from '@ensdomains/eth-ens-namehash';
import config from 'config';
import {JsonRpcResponse} from 'hardhat/types';
import {Provider, ChainId} from './provider';
import {DomainRegistry} from '../../name_service/types';
import {getNetworkPrivateKey} from '../../wallet/keystore';
import {POINT_ENS_TEXT_RECORD_KEY} from '../../name_service/constants';
import {ETH_RESOLVER_ABI} from '../../name_service/abis/resolver';
import logger from '../../core/log';
import {RPCRequest} from '../../rpc/rpc-handlers';
import {getNetworkConfig} from './utils';

const log = logger.child({module: 'EthereumProvider'});

type Ethers = ethers.providers.JsonRpcProvider;
type Libs = 'ethers' | 'web3';

/**
 * Singleton class to make calls and send transactions to Ethereum blockchain.
 * With potential support for multiple chains (mainnet, rinkeby, ynet, etc.).
 */
class EthereumProvider implements Provider {
    private static instance: EthereumProvider;

    // Lazily instantiated providers to interact with different Ethereum chains.
    private chains: {[key in ChainId]?: Record<Libs, Web3 | Ethers | null>} = {};

    private constructor() {}

    public static getInstance() {
        if (!EthereumProvider.instance) {
            EthereumProvider.instance = new EthereumProvider();
        }
        return EthereumProvider.instance;
    }

    /**
     * Creates a connection to an Ethereum provider with `web3.js` library.
     *
     * As long as we have a provider URL in the config for the given chain.
     * Otherwise, it throws an error.
     */
    private createWeb3Connection(chainId: ChainId): Web3 {
        // TODO: this only creates HTTP providers. Need to think best approach for WS.
        const network = getNetworkConfig(chainId);
        const host = network.address;
        const protocol = network.tls ? 'https' : 'http';
        const url = `${protocol}://${host}`;
        const privateKey = `0x${getNetworkPrivateKey()}`;

        const hdWalletProvider = new HDWalletProvider({
            privateKeys: [privateKey],
            providerOrUrl: url,
            pollingInterval: 30000
        });

        const nonceTracker = new NonceTrackerSubprovider();
        hdWalletProvider.engine._providers.unshift(nonceTracker);
        nonceTracker.setEngine(hdWalletProvider.engine);
        const web3 = new Web3(hdWalletProvider);
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        log.info({chainId, url}, 'Successfully created web3 instance.');
        return web3;
    }

    /**
     * Creates a connection to an Ethereum provider with `ethers` library.
     *
     * As long as we have a provider URL in the config for the given chain.
     * Otherwise, it throws an error.
     */
    private createEthersConnection(chainId: ChainId): Ethers {
        const networks: Record<string, string>[] = config.get('network.web3');
        const network = Object.values(networks).find(n => n.chain_id === chainId);
        if (!network) {
            const errMsg = `No network found with chain_id === ${chainId} in config.`;
            log.error({chainId}, errMsg);
            throw new Error(errMsg);
        }

        const host = network.address;
        const protocol = network.tls ? 'https' : 'http';
        const url = `${protocol}://${host}`;
        log.info({chainId, url}, 'Successfully created ethers instance.');
        return new ethers.providers.JsonRpcProvider(url);
    }

    /**
     * Returns a provider for the given chain.
     * If one is not already available, it's created.
     */
    private getChainProvider(chainId: ChainId, lib: 'web3'): Web3;
    private getChainProvider(chainId: ChainId, lib: 'ethers'): Ethers;
    private getChainProvider(chainId: ChainId, lib: Libs): Web3 | Ethers {
        if (!this.chains[chainId]) {
            this.chains[chainId] = {ethers: null, web3: null};
        }

        if (!this.chains[chainId]![lib]) {
            const conn =
                lib === 'ethers'
                    ? this.createEthersConnection(chainId)
                    : this.createWeb3Connection(chainId);

            this.chains[chainId]![lib] = conn;
        }

        return this.chains[chainId]![lib]!;
    }

    public name(chainId: ChainId): string {
        return `EthereumProvider (chain: ${chainId})`;
    }

    public async resolveDomain(chainId: ChainId, domainName: string): Promise<DomainRegistry> {
        const provider = this.getChainProvider(chainId, 'ethers');
        const resolver = await provider.getResolver(domainName);
        if (!resolver) {
            const errMsg = `Domain ${domainName} not found in Ethereum's chain ${chainId}.`;
            log.error({chainId, domainName}, errMsg);
            throw new Error(errMsg);
        }

        const [owner, content] = await Promise.all([
            provider.resolveName(domainName),
            resolver.getText(POINT_ENS_TEXT_RECORD_KEY)
        ]);

        return {owner: owner || '', content};
    }

    public async setDomainContent(
        chainId: ChainId,
        domainName: string,
        data: string
    ): Promise<Record<string, string | number | boolean>> {
        const network = getNetworkConfig(chainId);

        const tldAddress = String(network.eth_tld_resolver);
        if (!tldAddress) {
            const errMsg = `Missing TLD public resolver contract address for chain "${ChainId}"`;
            log.error({chainId, domainName}, errMsg);
            throw new Error(errMsg);
        }

        const provider = this.getChainProvider(chainId, 'ethers');
        const ensContract = new ethers.Contract(tldAddress, ETH_RESOLVER_ABI, provider);
        const hash = namehash.hash(domainName);
        const pk = getNetworkPrivateKey();
        const wallet = new ethers.Wallet(pk, provider);
        const ensWithSigner = ensContract.connect(wallet);
        const tx = await ensWithSigner.setText(hash, POINT_ENS_TEXT_RECORD_KEY, data);
        return tx;
    }

    public send(chainId: ChainId, data: RPCRequest): Promise<JsonRpcResponse> {
        return new Promise((resolve, reject) => {
            const {method, params} = data;
            const id = data.id ?? new Date().getTime();
            const provider = this.getChainProvider(chainId, 'web3');

            (provider.currentProvider as HttpProvider).send(
                {
                    id,
                    method,
                    params,
                    jsonrpc: '2.0'
                },
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        const noResultResp: JsonRpcResponse = {id, jsonrpc: '2.0'};
                        const resp = result ? (result as JsonRpcResponse) : noResultResp;
                        resolve(resp);
                    }
                }
            );
        });
    }

    public async sendTransaction(
        chainId: ChainId,
        reqId: number,
        txParams: unknown[]
    ): Promise<JsonRpcResponse> {
        const resp = await this.send(chainId, {
            id: reqId,
            method: 'eth_sendTransaction',
            params: txParams
        });
        return resp;
    }

    public async requestAccounts(chainId: ChainId, id: number): Promise<JsonRpcResponse> {
        const accts = await this.send(chainId, {id, method: 'eth_accounts'});
        return accts;
    }

    public async getBlockNumber(chainId: ChainId): Promise<number> {
        const provider = this.getChainProvider(chainId, 'ethers');
        const n = await provider.getBlockNumber();
        return n;
    }
}

export default EthereumProvider;
