const path = require('path');
const api_routes = require('../api_routes');
const ws_routes = require('../ws_routes');
const PointSDKController = require('./PointSDKController');
const app = require(path.resolve(__dirname, '..', '..', '..', 'package.json'));

class StatusController extends PointSDKController {
    constructor(ctx, req) {
        super(ctx, req);
    }

    async meta() {
        const status = await this._nodeStatus();
        return this._response(status);
    }

    async _nodeStatus() {
        const formatRoute = ([, route]) => route;

        const nodeJsVersion = process.version;
        const pointNodeVersion = app.version;
        const apiRoutes = api_routes.map(formatRoute);
        const wsRoutes = ws_routes.map(formatRoute);

        return {
            nodeJsVersion,
            pointNodeVersion,
            apiRoutes,
            wsRoutes
        };
    }
}

module.exports = StatusController;
