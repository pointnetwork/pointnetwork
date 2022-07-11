import EthereumProvider from './ethereum-provider';
import SolanaProvider from './solana-provider';
import {JsonRpcResponse} from 'hardhat/types';
import {DomainRegistry} from '../../name_service/types';
import logger from '../../core/log';
import {RPCRequest} from '../../rpc/rpc-handlers';

const log = logger.child({module: 'BlockchainProvider'});

export enum ChainId {
    PointYnet = 'ynet',
    EthereumMainnet = 1,
    EthereumRinkeby = 4,
    SolanaMainnet = 'mainnet-beta',
    SolanaDevnet = 'devnet'
}

export enum Blockchain {
    ETHEREUM = 'ethereum',
    SOLANA = 'solana'
}

/**
 * All blockchain providers must comply with this interface.
 */
export interface Provider {
    name(chainId: ChainId): string;
    resolveDomain(chainId: ChainId, domain: string): Promise<DomainRegistry>;
    setDomainContent(
        chainId: ChainId,
        domain: string,
        data: string
    ): Promise<Record<string, string | number | boolean>>;
    send(chainId: ChainId, data: RPCRequest): Promise<JsonRpcResponse>;
    sendTransaction(chainId: ChainId, reqId: number, txParams: unknown[]): Promise<JsonRpcResponse>;
    requestAccounts(chainId: ChainId, reqId: number): Promise<JsonRpcResponse>;
    getBlockNumber?(chainId: ChainId): Promise<number>;
}

const chainToBlockchain: {[k in ChainId]: Blockchain} = {
    [ChainId.PointYnet]: Blockchain.ETHEREUM,
    [ChainId.EthereumMainnet]: Blockchain.ETHEREUM,
    [ChainId.EthereumRinkeby]: Blockchain.ETHEREUM,
    [ChainId.SolanaMainnet]: Blockchain.SOLANA,
    [ChainId.SolanaDevnet]: Blockchain.SOLANA
};

export const tldToChain: Record<string, ChainId> = {
    '.sol': ChainId.SolanaMainnet,
    '.eth': ChainId.EthereumRinkeby
};

// Type guard to determine if a given string|number is a valid ChainId
export function isChainId(chainId: string | number | boolean): chainId is ChainId {
    if (typeof chainId === 'boolean') return false;
    return Object.values(ChainId).includes(chainId);
}

/**
 * BlockchainProvider is the abstraction that consolidates and exposes
 * blockchain functionality and provides a unified solution for working
 * with different chains such as Ethereum and Solana.
 */
class BlockchainProvider implements Provider {
    private providers: {[key in Blockchain]?: Provider} = {};

    private getProvider(chainId: ChainId): Provider {
        const blockchain = chainToBlockchain[chainId];
        if (!this.providers[blockchain]) {
            switch (blockchain) {
                case Blockchain.ETHEREUM:
                    this.providers[blockchain] = EthereumProvider.getInstance();
                    break;
                case Blockchain.SOLANA:
                    this.providers[blockchain] = SolanaProvider.getInstance();
                    break;
                default:
                    const errMsg = `Unsupported chain ID "${chainId}".`;
                    log.error({chainId}, errMsg);
                    throw new Error(errMsg);
            }
        }
        return this.providers[blockchain] as Provider;
    }

    private notImplementedErr(chainId: ChainId, method: string): Error {
        const errMsg = `Method ${method} not implemented by ${this.name(chainId)}`;
        log.error({chainId, method}, errMsg);
        return new Error(errMsg);
    }

    public name(chainId: ChainId): string {
        return this.getProvider(chainId).name(chainId);
    }

    public async resolveDomain(chainId: ChainId, domain: string): Promise<DomainRegistry> {
        const registry = await this.getProvider(chainId).resolveDomain(chainId, domain);
        return registry;
    }

    public async setDomainContent(
        chainId: ChainId,
        domain: string,
        data: string
    ): Promise<Record<string, string | number | boolean>> {
        const tx = await this.getProvider(chainId).setDomainContent(chainId, domain, data);
        return tx;
    }

    public async send(chainId: ChainId, data: RPCRequest): Promise<JsonRpcResponse> {
        const provider = this.getProvider(chainId);
        const resp = await provider.send(chainId, data);
        return resp;
    }

    public async sendTransaction(
        chainId: ChainId,
        reqId: number,
        txParams: unknown[]
    ): Promise<JsonRpcResponse> {
        const resp = await this.getProvider(chainId).sendTransaction(chainId, reqId, txParams);
        return resp;
    }

    public async requestAccounts(chainId: ChainId, reqId: number): Promise<JsonRpcResponse> {
        const accts = await this.getProvider(chainId).requestAccounts(chainId, reqId);
        return accts;
    }

    public async getBlockNumber(chainId: ChainId): Promise<number> {
        const provider = this.getProvider(chainId);
        if (!provider.getBlockNumber) {
            throw this.notImplementedErr(chainId, 'getBlockNumber');
        }

        const n = await provider.getBlockNumber(chainId);
        return n;
    }
}

export const blockchain = new BlockchainProvider();
