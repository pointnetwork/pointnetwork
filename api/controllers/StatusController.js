const packageJson = require('../../package.json');
const File = require('../../db/models/file');
const api_routes = require('../api_routes');
const ws_routes = require('../ws_routes');
const PointSDKController = require('./PointSDKController');

class StatusController extends PointSDKController {
  constructor(ctx) {
    super(ctx)
  }

  async status() {
    let status = await this._nodeStatus();
    return this._response(
      status
    )
  }

  async _nodeStatus() {
    function _formatRoute(route) {
      return `${route[0]} => ${route[1]} (${route[2]})`
    }
    let nodeJsVersion = process.version
    let fileCount = (await File.allKeys()).length;
    let peersCount = this.ctx.network.peersCount;
    let pointNetworkNodeVersion = packageJson.version;
    let apiRoutes = api_routes.map(_formatRoute)
    let wsRoutes = ws_routes.map(_formatRoute)

    return {
      nodeJsVersion,
      fileCount,
      peersCount,
      pointNetworkNodeVersion,
      apiRoutes,
      wsRoutes
    }
  }
}

module.exports = StatusController;