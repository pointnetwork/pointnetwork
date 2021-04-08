class Provider {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.provider;
    }

    async start() {
        await this.init();

        // todo: rewrite with threads!
        this.timeout = this.ctx.config.simulation_delay;
        this.timerFn = null;
        this.timerFn = async() => {
            await this.cycle();
            setTimeout(this.timerFn, this.timeout);
        };
        this.timerFn();
    }

    async init() {
        // this.storage = new Storage(ctx);
        // this.storage.start();
        //
        // this.proxy = new ZProxy(ctx);
        // this.proxy.start();

        // todo: why is this one doesn't give any error?
        //this.id = this.ctx.client.wallet.getNetworkAccount().replace({'0x':''});

        if (this.ctx.config.service_provider.enabled) {
            this.id = this.ctx.wallet.getNetworkAccount().replace('0x','').toLowerCase();

            await this.announce();
        }

        // start other services
    }

    async cycle() {
        // todo
    }

    getConnectionString() {
        return 'http://' + this.ctx.config.network.communication_external_host + ':' + this.ctx.config.network.communication_port + '/#' + this.id;
    }

    async announce() {
        // todo: see if already announced?

        console.log('Announcing '+this.getConnectionString()+'...');

        let collateralSizeEth = "5"; // todo: magic number
        let cost_per_kb = "1"; // todo: magic numbers

        return await this.ctx.web3bridge.announceStorageProvider(this.getConnectionString(), collateralSizeEth, cost_per_kb);
    }
}

module.exports = Provider;