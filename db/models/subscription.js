const Model = require('../model');

class Subscription extends Model {
  constructor(...args) {
    super(...args);    
  }

  static _buildIndices() {
    this._addIndex('address');
  }
}

module.exports = Subscription;
