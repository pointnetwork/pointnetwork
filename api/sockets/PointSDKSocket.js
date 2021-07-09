const Socket = require('./Socket')

class PointSDKSocket extends Socket {
    constructor(ctx, conn, wss) {
        super(ctx, conn, wss)
        this.init()
    }

    init() {
        this.ws.on('message', async (cmd) => {
            // expect the message to contain an object detailing the
            // contract and the contract event to subscribe to
            const cmdObj = JSON.parse(cmd)
            // TODO remove hardcoded target
            const target = 'hello.z'
            const options = {}
            // TODO improve this process and fix multiple subscritons
            // TODO unsubscribe?
            if(cmdObj.contract) {
                console.log('Subscribing to: ', cmdObj.contract)
                this.ctx.web3bridge.subscribeEvent(target, cmdObj.contract, cmdObj.event, this.callback.bind(this), options);
            }
        })
    }

    callback(event) {
        this.publishToClients(event.returnValues);
    }
}

module.exports = PointSDKSocket;