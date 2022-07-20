const sequelize_lib = require('sequelize');
const _ = require('lodash');
const {Database} = require('..');
const logger = require('../../core/log');
const log = logger.child({module: 'Model'});

const addUnderscoreIdFields = {};

class Model extends sequelize_lib.Model {
    constructor(...args) {
        super(...args);
    }

    static get connection() {
        if (!Model._connection) {
            Model._connection = Database.init();
        }
        return Model._connection;
    }

    static init(attributes, options) {
        const defaultOptions = {sequelize: Model.connection};
        options = Object.assign({}, defaultOptions, options);

        const defaultAttributeOptions = {allowNull: false};
        for (const fieldName in attributes) {
            const v = attributes[fieldName];
            if (v === null || v.constructor.name !== 'Object') {
                throw Error(
                    'Oops, I didn\'t think of how to handle this case: the options for attribute \'' +
                        fieldName +
                        '\' are not an object (value: ' +
                        v +
                        ')'
                );
            }
            attributes[fieldName] = Object.assign({}, defaultAttributeOptions, v);
        }

        super.init(attributes, options);
    }

    static async findOrCreate({where, defaults}, retry = false) {
        const res = await super.findOne({where});
        if (res) {
            return res;
        }
        try {
            const created = await super.create({
                ...where,
                ...defaults
            });
            return created;
        } catch (e) {
            log.error(e, 'Error in find or create');
            if (!retry && e.name === 'SequelizeUniqueConstraintError') {
                // We are running into the race condition, caused by concurrent tries
                // to findOrCreate the same directory. In this case, a single retry
                // should work, since the entity is already created at this moment
                log.debug('Retrying to find or create');
                return this.findOrCreate({where, defaults}, true);
            }
            throw e;
        }
    }

    static async findByIdOrCreate(id, defaults) {
        return this.findOrCreate({where: {id}, defaults});
    }

    async refresh() {
        return await this.reload();
    }

    static async allBy(field, value, logging = true) {
        return await this.findAll({where: {[field]: value}, logging});
    }
    static async findOneBy(field, value) {
        const collection = await this.findAll({
            where: {[field]: value},
            limit: 1 // Note: we only want one instance
        });
        return collection.length < 1 ? null : collection[0];
    }

    static async findOneByOrFail(field, value) {
        const one = await this.findOneBy(field, value);
        if (one === null) {
            throw Error(
                'Row not found: Model ' + this.constructor.name + ', ' + field + ' #' + value
            );
        } // todo: sanitize!
        return one;
    }

    static async find(id) {
        return await this.findByPk(id);
    }

    static async findOrFail(id, ...args) {
        const result = await this.findByPk(id, ...args);
        if (!result) throw Error('Row not found: Model ' + this.constructor.name + ', id #' + id); // todo: sanitize!
        return result;
    }

    static belongsTo(model, ...args) {
        // See constructor for the explanation of this block
        if (!addUnderscoreIdFields[this.name]) addUnderscoreIdFields[this.name] = [];
        addUnderscoreIdFields[this.name].push(model.name);

        const underscoredIdField = _.snakeCase(model.name) + '_id';
        const extraAttributes = {
            foreignKey: underscoredIdField,
            as: _.lowerFirst(_.camelCase(model.name))
        };
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
