import config from 'config';
const logger = require('../../core/log');
const log = logger.child({module: 'CosmosProvider'});
import {getCosmosWallet} from '../../wallet/keystore';
//  import {DirectSecp256k1HdWallet, OfflineSigner} from '@cosmjs/proto-signing';
import {assertIsDeliverTxSuccess, calculateFee, GasPrice, SigningStargateClient, StdFee} from '@cosmjs/stargate';
import {coins, OfflineSigner} from '@cosmjs/proto-signing';

export async function  createCosmosConnection(blockchainUrl: string, protocol = 'https') {
    const rpcEndpoint = `${protocol}://${blockchainUrl}`;
    const wallet = await getCosmosWallet();
    const connection = await SigningStargateClient.connectWithSigner(
        rpcEndpoint,
        wallet
    );
    return {connection, wallet: wallet};
}

interface CosmosNetworkCfg {
  type: string;
  name: string;
  http_address: string;
  currency_name: string;
  currency_code: string;
}

interface CosmosProvider {
  connection: SigningStargateClient;
  wallet: OfflineSigner
}

type CosmosProviders = Record<string, CosmosProvider>

export async function getProviders(
    networks: Record<string, CosmosNetworkCfg>) {
    const providers: CosmosProviders = {};
    const cosmosNetworks = Object.entries(networks)
        .filter(([, value]) => value.type === 'cosmos');
    for (const [net, value] of cosmosNetworks) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            providers[net] = await createCosmosConnection((value as any).http_address);
        } catch (e) {
            console.log({e});
        }
    }
    return providers;
}

interface SignAndSendTransactionOpts {
  recipient: string;
  gasPrice?: string;
  sendFee?: number;
  amount: number;
  unit: string;
  memo?: string;
}

export async function createCosmosProvider() {
    const providers: Record<string, { connection: SigningStargateClient, wallet: OfflineSigner }> =
      await getProviders(config.get('network.web3'));
    return {
        requestAccount: async (id: number, network: string) => {
            const provider = providers[network];
            if (!provider) {
                throw new Error(`Unknown network ${network}`);
            }
            const [firstAccount] = await provider.wallet.getAccounts();
            log.info(JSON.stringify(firstAccount));
            return {
                jsonrpc: '2.0',
                result: {publicKey: firstAccount.address},
                id
            };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signAndSendTransaction: async (id: number, network: string,
            options: SignAndSendTransactionOpts) => {
            const provider = providers[network];
            if (!provider) {
                throw new Error(`Unknown network ${network}`);
            }
            const {connection, wallet} = provider;
            const gasPrice = GasPrice.fromString(options.gasPrice || '0.025uatom');
            const sendFee: StdFee = calculateFee(options.sendFee || 80_000, gasPrice);
            const accounts = await wallet.getAccounts();
            const unit = options.unit || 'uatom'
            const {recipient, amount} = options;
            const [firstAccount] = accounts;
            const transaction = await connection.sendTokens(
                firstAccount.address,
                recipient,
                coins(amount, unit),
                sendFee,
                options.memo
            );
            assertIsDeliverTxSuccess(transaction);
            console.log('Successfully broadcasted:', transaction);
            return {
                jsonrpc: '2.0',
                result: transaction,
                id
            };
        }
    };
}

createCosmosProvider();
