const _ = require('lodash');
const DB = require('../DB');
const Indexable = require('./indexable');

class Model extends Indexable {
    constructor(_this) {
        super();
        this.id = null;
        this.address = null;
        this._attributes = {};
        this._originalAttributes = {};
    }

    static async find(id) {
        try {
            const data = await this.db.get(id);
            let model = this.new();
            model.id = id;
            model._hydrate(data);
            return model;
        } catch(err) {
            if (err.notFound) return null;
            else throw err;
        }
    }

    static async findOrCreate(id) {
        let result = await this.find(id);

        if (result !== null) {
            return result;
        } else {
            let created = await this.new();
            created.id = id;
            return created;
        }
    }

    static async findOrCreateAndSave(id) {
        let result = await this.find(id);

        if (result !== null) {
            return result;
        } else {
            let created = await this.new();
            created.id = id;
            await created.save();
            return created;
        }
    }

    static async all(query = {}, removePrefix = '') {
        let keys = await this.allKeys(query);
        let models = [];
        for(let k of keys) {
            models.push(await this.find(k.replace(removePrefix, '')));
        }
        return models;
    }

    static async allKeys(query = {}) {
        return new Promise((resolve, reject) => {
            let keys = [];
            this.db.createKeyStream(query)
                .on('data', (data) => {
                    keys.push(data);
                })
                .on('error', reject)
                .on('end', async () => {
                    resolve(keys);
                });
        });
        // todo: rewrite better? use db.iterator?
    }

    static new() {
        // let model = new this();
        let model = new (require('./models/'+this.tableName));
        model.ctx = this.ctx;
        model.tableName = this.tableName;
        model.db = this.db;
        model._indices = this._indices;
        model._indexReducers = this._indexReducers;

        return new Proxy(model, {
            get: (model, key) => {
                const getterName = 'get' + _.upperFirst(_.camelCase(key));
                if (_.startsWith(key, '_')) {
                    return model[key];
                } else if (model[getterName] && typeof model[getterName] === 'function') {
                    return model[getterName]();
                } else if (key in model) {
                    return model[key];
                } else {
                    return model._attributes[key];
                }
            },
            set: (model, key, value) => {
                const setterName = 'set' + _.upperFirst(_.camelCase(key));
                if (_.startsWith(key, '_')) {
                    model[key] = value;
                } else if (model[setterName] && typeof model[setterName] === 'function') {
                    model[setterName](value);
                } else if (key in model) {
                    model[key] = value;
                } else if (key === 'id') {
                    model.id = value;
                    model._attributes.id = value;
                } else {
                    model._attributes[key] = value;
                }
                return true;
            }
        });
    }

    async refresh() {
        let refreshed = await this.db.get(this.id);
        if (!refreshed) throw new Error('Row not found');
        for(let k in refreshed) {
            if (refreshed.hasOwnProperty(k) && typeof refreshed[k] !== 'function') {
                this._attributes[k] = refreshed[k];
                this._originalAttributes[k] = refreshed[k];
            }
        }
    }

    async save() {
        // todo: maybe do refresh first? and maybe at the end? // refresh, and if original attrs dont match, throw Error(race condition)

        if (this.id === null || typeof this.id === 'undefined') {
            this.id = DB.generateRandomIdForNewRecord();
        }
        this._attributes.id = this.id;
        let batch = this.db.batch();
        batch = this._fixIndices(batch);
        batch = batch.put(this.id, this._attributes);
        await new Promise((resolve, reject) => {
            batch.write((err) => {
                if (err) reject(err);
                this._originalAttributes = _.cloneDeep(this._attributes);
                resolve();
            });
        });
    }

    _hydrate(data) {
        this._originalAttributes = Object.assign({}, data);
        this._attributes = Object.assign({}, data);
    }

    toJSON() {
        // todo: Object.assign still not immutable (nested) - Object.freeze? immutable.js?
        return Object.assign({}, this._attributes, {id: this.id});
    }
}

module.exports = Model;