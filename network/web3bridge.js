const path = require('path');
const Web3 = require('web3');
const fs = require('fs');

class Web3Bridge {
    constructor(ctx) {
        this.ctx = ctx;
        this.connectionString = this.ctx.config.network.web3;
        this.network_id = this.ctx.config.network.web3_network_id;
        this.chain_id = this.ctx.config.network.web3_chain_id;

        this.web3 = new Web3(this.connectionString);
        this.ctx.network.web3 = this.web3; // todo: maybe you should hide it behind this abstraction, no?

        this.address = this.ctx.config.client.wallet.account;
        const account = this.web3.eth.accounts.privateKeyToAccount('0x' + this.ctx.config.client.wallet.privateKey);
        this.web3.eth.accounts.wallet.add(account);
        this.web3.eth.defaultAccount = account.address;
    }

    async start() {
    }

    async loadContract(name, at) {
        const abiFileName = path.join(this.ctx.basepath, 'truffle/build/contracts/'+name+'.json');
        const abiFile = JSON.parse(fs.readFileSync(abiFileName));
        const abi = abiFile.abi;
        const bytecode = abiFile.bytecode;

        const contract = new this.web3.eth.Contract(abi, at);

        return contract;
    }

    async web3send(method, gasLimit) {
        const account = this.web3.eth.defaultAccount;
        const gasPrice = await this.web3.eth.getGasPrice();
        console.log(account);
        if (!gasLimit) gasLimit = await method.estimateGas({ from: account });
        return await method.send({ from: account, gasPrice, gas: gasLimit });
    }

    async getZRecord(domain) {
        domain = domain.replace('.z', '');
        const ZDNSContract = await this.loadContract('ZDNS', this.ctx.config.network.zdns_contract_address);
        let result = await ZDNSContract.methods.getZRecord(domain).call();
        result = result.replace('0x', '').toLowerCase();
        return result;
    }
    async putZRecord(domain, routesFile) {
        domain = domain.replace('.z', '');
        const contract = await this.loadContract('ZDNS', this.ctx.config.network.zdns_contract_address);
        const method = contract.methods.putZRecord(domain, routesFile);
        console.log(await this.web3send(method, 1000000));
    }

    async getKeyValue(domain, key) {
        domain = domain.replace('.z', '');
        const contract = await this.loadContract('KeyValue', this.ctx.config.network.keyvalue_contract_address);
        let result = await contract.methods.get(domain + '/' + key).call();
        console.log(result);
        return result;
    }
    async putKeyValue(domain, key, value) {
        domain = domain.replace('.z', '');
        const contract = await this.loadContract('KeyValue', this.ctx.config.network.keyvalue_contract_address);
        const method = contract.methods.put(domain + '/' + key, value);
        console.log(await this.web3send(method, 2000000));
    }
}

module.exports = Web3Bridge;