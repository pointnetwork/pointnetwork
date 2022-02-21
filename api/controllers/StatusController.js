const packageJson = require('../../package.json');
const File = require('../../db/models/file');
const api_routes = require('../api_routes');
const ws_routes = require('../ws_routes');
const PointSDKController = require('./PointSDKController');

class StatusController extends PointSDKController {
    constructor(ctx, req) {
        super(ctx, req);
    }

    async meta() {
        const status = await this._nodeStatus();
        return this._response(status);
    }

    async _nodeStatus() {
        function _formatRoute(route) {
            return `${route[0]} => ${route[1]} (${route[2]})`;
        }

        const nodeJsVersion = process.version;
        const fileCount = (await File.allKeys()).length;
        const peersCount = this.ctx.network.peersCount;
        const pointNetworkNodeVersion = packageJson.version;
        const apiRoutes = api_routes.map(_formatRoute);
        const wsRoutes = ws_routes.map(_formatRoute);

        return {
            nodeJsVersion,
            fileCount,
            peersCount,
            pointNetworkNodeVersion,
            apiRoutes,
            wsRoutes
        };
    }
}

module.exports = StatusController;
