const Model = require('../model');

class Identity extends Model {
    constructor(...args) {
        super(...args);
    }

    /*
     * Fields:
     * - id
     * - handle
     * - owner
     * - last_updated
     */
}

Identity.__ignoreThisModelForNow = true;

module.exports = Identity;
