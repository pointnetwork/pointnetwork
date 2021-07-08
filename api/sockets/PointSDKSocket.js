const Socket = require('./Socket')

class PointSDKSocket extends Socket {
    constructor(ctx, conn, wss) {
        super(ctx, conn, wss)

        // TODO: remove hardcoded values and allow client to subscrible to multiple contracts / events
        const target = 'hello.z'
        const contract = 'Hello'
        const event = 'HelloWorld'
        const options = {}
        this.ctx.web3bridge.subscribeEvent(target, contract, event, this.callback.bind(this), options);
    }

    callback(event) {
        this.publishToClients(event.returnValues);
    }
}

module.exports = PointSDKSocket;