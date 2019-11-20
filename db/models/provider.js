const Model = require('../model');
const _ = require('lodash');

class Provider extends Model {
    constructor(...args) {
        super(...args);
    }

    static _buildIndices() {
        // this._addIndex('provider');
    }
}

module.exports = Provider;