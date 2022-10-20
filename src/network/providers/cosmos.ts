import config from 'config';
import logger from '../../core/log';
import {getCosmosWallet} from '../../wallet/keystore';
import {assertIsDeliverTxSuccess, calculateFee, GasPrice, SigningStargateClient, StdFee} from '@cosmjs/stargate';
import {coins, OfflineSigner} from '@cosmjs/proto-signing';

const log = logger.child({module: 'CosmosProvider'});

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
  defaultGasPrice: string;
  defaultSendFee: number;
  defaultSendFeeUnit: string;
}

interface CosmosProvider {
  connection: SigningStargateClient;
  wallet: OfflineSigner;
  config: CosmosNetworkCfg;
}

type CosmosProviders = Record<string, CosmosProvider>

export async function getProviders(
    networks: Record<string, CosmosNetworkCfg>) {
    const providers: CosmosProviders = {};
    const cosmosNetworks = Object.entries(networks)
        .filter(([, providerCfg]) => providerCfg.type === 'cosmos');
    for (const [net, providerCfg] of cosmosNetworks) {
        try {
            providers[net] = {
                ...await createCosmosConnection(providerCfg.http_address),
                config: providerCfg
            };

        } catch (error) {
            log.error(`Could not connect to cosmos network: ${net} with address: ${providerCfg.http_address} due to: ${error}`);
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
    const providers: Record<string, CosmosProvider> =
      await getProviders(config.get('network.web3'));
    return {
        requestAccount: async (id: number, network: string) => {
            const provider = providers[network];
            if (!provider) {
                throw new Error(`Unknown network ${network}`);
            }
            const [firstAccount] = await provider.wallet.getAccounts();
            return {
                jsonrpc: '2.0',
                result: {publicKey: firstAccount.address},
                id
            };
        },

        signAndSendTransaction: async (id: number, network: string,
            options: SignAndSendTransactionOpts) => {
            const provider = providers[network];
            if (!provider) {
                throw new Error(`Unknown network ${network}`);
            }
            const {connection, wallet, config} = provider;
            const gasPrice = GasPrice.fromString(options.gasPrice || config.defaultGasPrice);
            const sendFee: StdFee = calculateFee(
                options.sendFee || config.defaultSendFee, gasPrice
            );
            const accounts = await wallet.getAccounts();
            const unit = options.unit || config.defaultSendFeeUnit;
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
            return {
                jsonrpc: '2.0',
                result: transaction,
                id
            };
        }
    };
}

createCosmosProvider();
