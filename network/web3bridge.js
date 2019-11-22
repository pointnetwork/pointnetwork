const path = require('path');
const Web3 = require('web3');
const fs = require('fs');

const ZDNS_ROUTES_KEY = 'zdns/routes';

class Web3Bridge {
    constructor(ctx) {
        this.ctx = ctx;
        this.connectionString = this.ctx.config.network.web3;
        this.network_id = this.ctx.config.network.web3_network_id;
        this.chain_id = this.ctx.config.network.web3_chain_id;

        this.web3 = this.ctx.web3 = this.ctx.network.web3 = new Web3(this.connectionString); // todo: maybe you should hide it behind this abstraction, no?
        this.ctx.web3bridge = this;

        this.address = this.ctx.config.client.wallet.account;
        const account = this.web3.eth.accounts.privateKeyToAccount('0x' + this.ctx.config.client.wallet.privateKey);
        this.web3.eth.accounts.wallet.add(account);
        this.web3.eth.defaultAccount = account.address;
    }

    async start() {
    }

    async loadIdentityContract() {
        const at = this.ctx.config.network.identity_contract_address;
        const abiFileName = path.join(this.ctx.basepath, 'truffle/build/contracts/Identity.json');
        const abiFile = JSON.parse(fs.readFileSync(abiFileName));
        const abi = abiFile.abi;
        // const bytecode = abiFile.bytecode;

        return new this.web3.eth.Contract(abi, at);
    }

    async web3send(method, gasLimit) {
        const account = this.web3.eth.defaultAccount;
        const gasPrice = await this.web3.eth.getGasPrice();
        console.log(account);
        if (!gasLimit) gasLimit = await method.estimateGas({ from: account });
        return await method.send({ from: account, gasPrice, gas: gasLimit });
    }

    async getZRecord(domain) {
        domain = domain.replace('.z', ''); // todo: rtrim instead
        let result = await this.getKeyValue(domain, ZDNS_ROUTES_KEY);
        if (result.substr(0, 2) === '0x') result = result.substr(2);
        return result;
    }
    async putZRecord(domain, routesFile) {
        domain = domain.replace('.z', ''); // todo: rtrim instead
        return await this.putKeyValue(domain, ZDNS_ROUTES_KEY, routesFile)
    }

    async getKeyValue(identity, key) {
        identity = identity.replace('.z', ''); // todo: rtrim instead
        const contract = await this.loadIdentityContract();
        let result = await contract.methods.ikvGet(identity, key).call();
        console.log(result);
        return result;
    }
    async putKeyValue(identity, key, value) {
        // todo: only send transaction if it's different. if it's already the same value, no need
        identity = identity.replace('.z', ''); // todo: rtrim instead
        const contract = await this.loadIdentityContract();
        const method = contract.methods.ikvPut(identity, key, value);
        console.log(await this.web3send(method, 2000000));
    }
}

module.exports = Web3Bridge;