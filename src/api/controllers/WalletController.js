const PointSDKController = require('./PointSDKController');
const ethereumjs = require('ethereumjs-util');
const ethereum = require('../../network/providers/ethereum');
const {getNetworkPublicKey, getNetworkPrivateKey} = require('../../wallet/keystore');
const {
    encryptData,
    decryptData,
    getEncryptedSymetricObjFromJSON
} = require('../../client/encryptIdentityUtils');
const {getBalance, getWalletAddress, sendTransaction, sendToken} = require('../../wallet');
const config = require('config');
const Web3 = require('web3');
const ERC20 = require('../../abi/ERC20.json');
const {utils} = require('ethers');

const networks = config.get('network.web3');

class WalletController extends PointSDKController {
    constructor(ctx, req, reply) {
        super(ctx, req);
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
        // return the wallet balance
        return this._response({balance: await getBalance({network: this.req.query.network})});
    }

    hash() {
        const partialPK = getNetworkPrivateKey().slice(0, 33);
        const hashBuffer = ethereumjs.sha256(Buffer.from(partialPK));
        const hash = ethereumjs.bufferToHex(hashBuffer);

        return this._response({hash});
    }
    
    async getWalletInfo() {
        const identity = await ethereum.getCurrentIdentity();
        const ynetAddress = identity ? `${identity}.point` : 'N/A';
        const wallets = [
            // TODO: remove this placeholder once we add a real point network
            {
                network: 'pointnet',
                type: 'eth',
                currency_name: 'Point',
                currency_code: 'POINT',
                address: ynetAddress,
                balance: 0
            },
            ...await Promise.all(Object.keys(networks).map(async network => ({
                network,
                type: networks[network].type,
                currency_name: networks[network].currency_name,
                currency_code: networks[network].currency_code,
                address: network === 'ynet' ? ynetAddress : getWalletAddress(({network})),
                balance: await getBalance({network, majorUnits: true})
            })))
        ];

        return this._response({wallets});
    }

    async getTokenBalances() {
        const tokens = Object.keys(networks)
            .filter(key => networks[key].type === 'eth')
            .reduce((acc, cur) => ({...acc, [cur]: networks[cur].tokens}), {});

        const web3 = new Web3();
        const decimalsCallData = web3.eth.abi.encodeFunctionCall(
            ERC20.find(func => func.name === 'decimals'), []
        );
        const balanceOfCallData = web3.eth.abi.encodeFunctionCall(
            ERC20.find(func => func.name === 'balanceOf'),
            [getWalletAddress({})]
        );

        await Promise.all(Object.keys(tokens).map(async network => {
            const balances = await Promise.all(tokens[network].map(async token => {
                const [balance, decimals] = await Promise.all([
                    ethereum.send({
                        method: 'eth_call',
                        params: [{
                            from: getWalletAddress({}),
                            to: token.address,
                            data: balanceOfCallData
                        }, 'latest'],
                        id: new Date().getTime(),
                        network
                    }),
                    ethereum.send({
                        method: 'eth_call',
                        params: [{
                            from: getWalletAddress({}),
                            to: token.address,
                            data: decimalsCallData
                        }, 'latest'],
                        id: new Date().getTime() + Math.round(Math.random() * 100000),
                        network
                    })
                ]);

                return {
                    balance:
                        utils.formatUnits(
                            balance.result.toString(),
                            decimals.result.toString()
                        ),
                    decimals: Number(decimals.result.toString())
                };
            }));
            
            tokens[network] = tokens[network].map((token, index) => ({
                ...token,
                balance: balances[index].balance,
                decimals: balances[index].decimals
            }));
        }));

        return this._response(tokens);
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
            privateKey.slice(2)
        );
        return this._response({decryptedData: decryptedData.plaintext.toString()});
    }
}

module.exports = WalletController;
