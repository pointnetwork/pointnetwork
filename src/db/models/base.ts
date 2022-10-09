const sequelize_lib = require('sequelize');
const {Database} = require('..');
import {LOCK,ModelAttributes, Attributes, InitOptions, Model as M, Transaction, ModelStatic, BelongsToOptions} from 'Sequelize';
import _ from 'lodash';

const addUnderscoreIdFields: Record<string, string[]> = {};

class Model extends sequelize_lib.Model {
    // constructor(...args) {
    //     super(...args);
    // }

    static get connection() {
        if (!Model._connection) {
            Model._connection = Database.init();
        }
        return Model._connection;
    }

    static init(attributes: ModelAttributes<M, Attributes<M>>, options: InitOptions<M>) {
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

    // static async findOrCreate({where, defaults}, retry = false) {
    //     const res = await super.findOne({where});
    //     if (res) {
    //         return res;
    //     }
    //     try {
    //         const created = await super.create({
    //             ...where,
    //             ...defaults
    //         });
    //         return created;
    //     } catch (e) {
    //         if (!retry && e.name === 'SequelizeUniqueConstraintError') {
    //             // We are running into the race condition, caused by concurrent tries
    //             // to findOrCreate the same directory. In this case, a single retry
    //             // should work, since the entity is already created at this moment
    //             log.debug({where, defaults, retry});
    //             log.debug('findOrCreate ran into SequelizeUniqueConstraintError. Retrying to findOrCreate...');
    //             return await this.findOrCreate({where, defaults}, true);
    //         } else {
    //             log.error(e, 'Error in find or create');
    //             throw e;
    //         }
    //     }
    // }

    static async findByIdOrCreate(id: string, defaults:  | null, transaction: Transaction, lock: LOCK) {
        const options: Record<string, any> = {returning: true};
        if (transaction) options.transaction = transaction;
        if (lock) options.lock = lock;

        const upsertResult = await this.upsert(Object.assign({}, {id}, defaults), options);

        if (upsertResult[1] !== null) throw new Error('upsertResult[1] !== null');

        // const instance = upsertResult[0];
        // return instance;

        return await this.findOrFail(id, options);

        // return this.findOrCreate({where: {id}, defaults});
    }

    async refresh() {
        return await this.reload();
    }

    static async allBy(field: string, value: string, logging = true, options: any) {
        const _options = Object.assign({}, {where: {[field]: value}, logging}, options);
        return await this.findAll(_options);
    }
    static async findOneBy(field: string, value: string) {
        const collection = await this.findAll({
            where: {[field]: value},
            limit: 1 // Note: we only want one instance
        });
        return collection.length < 1 ? null : collection[0];
    }

    static async findOneByOrFail(field: string, value: string) {
        const one = await this.findOneBy(field, value);
        if (one === null) {
            throw Error(
                'Row not found: Model ' + this.constructor.name + ', ' + field + ' #' + value
            );
        } // todo: sanitize!
        return one;
    }

    static async find(id: string, ...args: any[]) {
        return await this.findByPk(id, ...args);
    }

    static async findOrFail(id: string, ...args: any[]) {
        const result = await this.findByPk(id, ...args);
        if (!result) throw Error('Row not found: Model ' + this.constructor.name + ', id #' + id); // todo: sanitize!
        return result;
    }

    static belongsTo(model: ModelStatic<M>, ...args: BelongsToOptions[]) {
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

    static transaction(...args: any[]) {
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
