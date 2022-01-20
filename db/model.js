const sequelize_lib = require('sequelize');
const { Op } = require("sequelize");
const _ = require("lodash");

let addUnderscoreIdFields = {};

class Model extends sequelize_lib.Model {
    constructor(...args) {
        super(...args);
        this.ctx = Model.ctx;

        // Sequelize requires relations in JS to be in the form of 'ProviderId'
        // This creates proxy getters and setters allowing the same field to be aliased as 'provider_id' and 'providerId'
        if (addUnderscoreIdFields[this.constructor.name]) {
            for(let model of addUnderscoreIdFields[this.constructor.name]) {
                const original_field = model+'Id';
                const underscore_field = _.snakeCase(original_field);
                const misspelled_original_field = _.lowerFirst(original_field);

                // Object.defineProperty(this, underscore_field, {
                //     get: function() { return this[original_field]; },
                //     set: function(newValue) { this[original_field] = newValue; }
                // });
                // Object.defineProperty(this, misspelled_original_field, {
                //     get: function() { return this[original_field]; },
                //     set: function(newValue) { this[original_field] = newValue; }
                // });
            }
        }
    }

    static init(attributes, options) {
        const defaultOptions = {
            sequelize: Model.connection,
        };
        options = Object.assign({}, defaultOptions, options);

        const defaultAttributeOptions = {
            allowNull: false
        };
        for(const fieldName in attributes) {
            let v = attributes[fieldName];
            if (v === null || v.constructor.name !== "Object") {
                throw Error("Oops, I didn't think of how to handle this case: the options for attribute '"+fieldName+"' are not an object (value: "+v+")");
            }
            attributes[fieldName] = Object.assign({}, defaultAttributeOptions, v);
        }

        super.init(attributes, options);
    }

    static async findOrCreate({where, defaults}) {
        const res = await super.findOne({ where });
        if (res) {
            return res;
        }
        return super.create({
            ...where,
            ...defaults
        });
    }

    static async findByIdOrCreate(id, defaults) {
        return this.findOrCreate({where: {id}, defaults});
    }

    async refresh() {
        return await this.reload();
    }

    static async allBy(field, value) {
        return await this.findAll({
            where: {
                [field]: value
            }
        });
    }

    static async findOneBy(field, value) {
        const collection = await this.findAll({
            where: {
                [field]: value
            },
            limit: 1 // Note: we only want one instance
        });
        return (collection.length < 1) ? null : collection[0];
    }

    static async findOneByOrFail(field, value) {
        const one = await this.findOneBy(field, value);
        if (one === null) throw Error('Row not found: Model '+this.constructor.name+', '+field+' #'+value); // todo: sanitize!
        return one;
    }

    static async find(id) {
        return await this.findByPk(id);
    }

    static async findOrFail(id, ...args) {
        const result = await this.findByPk(id, ...args);
        if (!result) throw Error('Row not found: Model '+this.constructor.name+', id #'+id); // todo: sanitize!
        return result;
    }

    static belongsTo(model, ...args) {
        // See constructor for the explanation of this block
        if (!addUnderscoreIdFields[this.name]) addUnderscoreIdFields[this.name] = [];
        addUnderscoreIdFields[this.name].push(model.name);

        const underscoredIdField = _.snakeCase(model.name) + '_id';
        const extraAttributes = { foreignKey: underscoredIdField, as: _.lowerFirst(_.camelCase(model.name)) };
        args[0] = Object.assign({}, extraAttributes, args[0] || {});

        super.belongsTo(model, ...args);
    }

    static transaction(...args) {
        return this.connection.transaction(...args);
    }

    // get(field, ...args) {
    //     if (_.endsWith(field, '_id')) {
    //         // provider_id -> ProviderId
    //         return super.get(_.upperFirst(_.camelCase(field)), ...args);
    //     } else {
    //         return super.get(field, ...args);
    //     }
    // }
}

module.exports = Model;
