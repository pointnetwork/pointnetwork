const PointSDKController = require('./PointSDKController');
const ethereumjs = require('ethereumjs-util');
const ethereum = require('../../network/providers/ethereum.js');
const {getNetworkPublicKey, getNetworkPrivateKey} = require('../../wallet/keystore.js');
const {
    encryptData,
    decryptData,
    decryptSymmetricKey,
    decryptDataWithDecryptedKey,
    getEncryptedSymetricObjFromJSON
} = require('../../client/encryptIdentityUtils');
const {getBalance, getTokenBalanceAndDecimals, getWalletAddress, sendTransaction, sendToken} = require('../../wallet');
const config = require('config');
const {getIdentity} = require('../../name_service/identity');
const {_timeout} = require('../../util/_timeout.js');

const networks = config.get('network.web3');
const DEFAULT_NETWORK = config.get('network.default_network');
const DEFAULT_TIMEOUT = 20000;

class WalletController extends PointSDKController {
    constructor(req, reply) {
        super(req);
        this.req = req;
        this.payload = req.body;
        this.reply = reply;
    }

    publicKey() {
        const publicKey = getNetworkPublicKey();

        return this._response({publicKey});
    }

    address() {
        return this._response({address: getWalletAddress({network: this.req.query.network})});
    }

    async balance() {
        let network = this.req.query.network;

        let token = null;
        if (network.includes('.')) {
            const [networkName, tokenAddress] = network.split('.');
            network = networkName;
            token = tokenAddress;
    
            // if this token is the native token of the network, then we don't need to go to token function
            if (networks[network].currency_code.toLowerCase() === token.toLowerCase()) {
                token = null;
            }
        }

        if (!networks[network]) {
            throw new Error(`Unknown network ${network}`);
        }

        if (token) {
            return this._response(await getTokenBalanceAndDecimals(network, token));
        }

        // return the wallet balance
        return this._response({balance: await getBalance({network}), decimals: networks[network].decimals});
    }

    hash() {
        const partialPK = getNetworkPrivateKey().slice(0, 33);
        const hashBuffer = ethereumjs.sha256(Buffer.from(partialPK));
        const hash = ethereumjs.bufferToHex(hashBuffer);

        return this._response({hash});
    }

    async getBalances() {
        const networkNames = Object.keys(networks);
        const promises = networkNames.map(networkName => getBalance({network: networkName}));
        const values = await Promise.all(promises);
        
        const result = networkNames.reduce((acc, key, index) => {
            acc[key] = values[index];
            return acc;
        }, {});

        return {balances: result};
    }

    async _getIdentityNameForNetwork(network) {
        let alias = '';
        try {
            switch (network) {
                case 'solana':
                case 'ethereum':
                    const nsData = await _timeout(
                        getIdentity({targets: [network]}),
                        DEFAULT_TIMEOUT,
                        'Timeout'
                    );
                    alias = nsData.identity ?? '';
                    break;
                default:
                    alias = null;
            }
        } catch (e) {
            alias = null;
        }
        return alias;
    }

    async getIdentityNames() {
        return [
            ...(await Promise.all(
                Object.keys(networks).map(async network => await this._getIdentityNameForNetwork(network))
            ))
        ];
    }

    async _getPointIdentity() {
        const identity = await ethereum.getCurrentIdentity();
        const pointIdentity = identity ? `${identity}.point` : 'N/A';
        return pointIdentity;
    }

    async _getAddressForNetwork(network) {
        return (network === DEFAULT_NETWORK)
            ? await this._getPointIdentity()
            : getWalletAddress({network});
    }

    async getNetworks() {
        return { networks };
    }

    async getAddresses() {
        const addresses = {};
        for (const network in networks) {
            addresses[network] = await this._getAddressForNetwork(network);
        }
        return { addresses };
    }

    async send() {
        const {to, network, value, messageId} = this.payload;
        return sendTransaction({to, network, value, messageId});
    }

    async sendToken() {
        const {tokenAddress, to, network, value, messageId} = this.payload;

        return sendToken({tokenAddress, to, network, value, messageId});
    }

    async encryptData() {
        const {publicKey, data} = this.payload;
        const {host} = this.req.headers;
        const encryptedData = await encryptData(host, data, publicKey);
        return this._response(encryptedData);
    }

    async decryptSymmetricKey() {
        const {host} = this.req.headers;
        const privateKey = getNetworkPrivateKey();

        const encryptedSymmetricObj = getEncryptedSymetricObjFromJSON(
            JSON.parse(this.payload.encryptedSymmetricObj)
        );
        const decryptedSymmetricKey = await decryptSymmetricKey(
            host,
            encryptedSymmetricObj,
            privateKey
        );
        return this._response({decryptedSymmetricKey});
    }

    async decryptDataWithDecryptedKey() {
        const {host} = this.req.headers;

        const decryptedData = await decryptDataWithDecryptedKey(
            host,
            Buffer.from(this.payload.encryptedData, 'hex'),
            this.payload.symmetricObj
        );
        return this._response({decryptedData: decryptedData.plaintext.toString()});
    }

    async decryptData() {
        const {host} = this.req.headers;
        const privateKey = getNetworkPrivateKey();

        const encryptedSymmetricObj = getEncryptedSymetricObjFromJSON(
            JSON.parse(this.payload.encryptedSymmetricObj)
        );
        const decryptedData = await decryptData(
            host,
            Buffer.from(this.payload.encryptedData, 'hex'),
            encryptedSymmetricObj,
            privateKey
        );
        return this._response({decryptedData: decryptedData.plaintext.toString()});
    }
}

module.exports = WalletController;
