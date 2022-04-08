import BN from 'bn.js';
import path from 'path';

export interface EthereumProvider {
    send(method: 'eth_chainId', params: []): Promise<string>;
}

export const getChainId = async (provider: EthereumProvider): Promise<number>  => {
    const id = await provider.send('eth_chainId', []);
    return new BN(id.replace(/^0x/, ''), 'hex').toNumber();
}

export const getProxyMetadataFileName = async (provider: EthereumProvider) => {
    const networkFileNames: { [chainId in number]?: string } = {
        1: 'mainnet.json',
        2: 'morden.json',
        3: 'ropsten.json',
        4: 'rinkeby.json',
        5: 'goerli.json',
        42: 'kovan.json'
    };
    const chainId = await getChainId(provider);
    return networkFileNames[chainId] ?? `unknown-${chainId}.json`;
}

//code to return exact the same file path of openzeppelin upgradable plugin
export const getProxyMetadataFilePath = async (provider: EthereumProvider) => {
    const manifestDir = '.openzeppelin';
    const name = await getProxyMetadataFileName(provider);
    return path.join('.', manifestDir, name);
}

