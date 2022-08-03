import {BlockchainProvider} from './blockchain-provider';
import EthereumProvider from './ethereum-provider';
import SolanaProvider from './solana-provider';

export const blockchain = new BlockchainProvider(EthereumProvider, SolanaProvider);
