import {BlockchainProvider} from '../blockchain-provider';
import MockEthereumProvider from './ethereum-provider';
import MockSolanaProvider from './solana-provider';

export const blockchain = new BlockchainProvider(MockEthereumProvider, MockSolanaProvider);
