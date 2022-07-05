const PointSDKController = require('./PointSDKController');
const open = require('open');

class Web2Controller extends PointSDKController {
    constructor(req, reply) {
        super(req, true);
        this.req = req;
        this.host = this.req.headers.host;
        this.payload = req.body;
        this.reply = reply;
    }

    async open() {
        if (this.host !== 'point') return this.reply.callNotFound();
        const url = this.payload.urlToOpen;
        try {
            open(url);
            return this._response(true);
        } catch (e){
            return this._response(false);
        }
        
    }

}

module.exports = Web2Controller;
