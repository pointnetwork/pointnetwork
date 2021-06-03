const PointController = require('./PointController')

class ContractController extends PointController {
  constructor(ctx, request) {
    super(ctx)
    this.request = request
  }

  async call() {
    const host = this.request.query.host;
    const contractName = this.request.query.contractName;
    const method = this.request.query.method;
    const params = this.request.query.params;

    let data = await this.ctx.web3bridge.callContract(host, contractName, method, params);

    return this._response(data)
  }
}

module.exports = ContractController;