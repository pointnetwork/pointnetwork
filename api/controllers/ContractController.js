const PointController = require('./PointController')

class ContractController extends PointController {
  constructor(ctx) {
    super(ctx)
  }

  call() {
    return this._response({
      key: 'some value'
    })
  }
}

module.exports = ContractController;