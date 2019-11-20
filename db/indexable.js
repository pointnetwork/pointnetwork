const _ = require('lodash');
const sublevel = require('sublevel');

class Indexable {
    constructor() {
        this._indices = [];
        this._indexReducers = {};
    }

    static _addIndex(field, reducer = null) {
        if (typeof this._indices === 'undefined') this._indices = [];
        this._indices.push(field);

        if (reducer === null) reducer = x => (typeof x[field] === 'undefined') ? undefined : x[field] + '!' + x.id;

        const by = 'by'+_.upperFirst(_.camelCase(field));
        if (typeof this._indexReducers === 'undefined') this._indexReducers = {};
        this._indexReducers[by] = reducer;
    }

    _fixIndices(batch) {
        for(let i of this._indices) {
            const by = 'by' + _.upperFirst(_.camelCase(i));
            const reducer = this._indexReducers[by];
            if (reducer(this._originalAttributes) !== reducer(this._attributes)) {
                let newKey = reducer(this._attributes);
                newKey = i+"/\u0001"+newKey;
                batch = batch.put(newKey, this.id);
                if (typeof reducer(this._originalAttributes) !== 'undefined') {
                    let oldKey = reducer(this._originalAttributes);
                    oldKey = i+"/\u0001"+oldKey;
                    batch = batch.del(oldKey);
                }
            }
        }
        return batch;
    }

    static _buildIndices() {
        // NOTE: add indices in subclasses
    }

    static async allBy(field, value) {
        // todo: use sublevel, not this shit
        // todo: use prepared reducers, dont combine manually again
        const query = {
            gte: "\u0000/\u0000"+this.tableName+"/\u0001"+field+"/\u0001"+value+"!\u0000",
            lte: "\u0000/\u0000"+this.tableName+"/\u0001"+field+"/\u0001"+value+"!\uffff",
        };

        return await this.all(query, field+"/\u0001"+value+'!');
    }

    static async findBy(field, value) {
        let all = await this.allBy(field, value);
        if (all.length === 0) return null;
        return all[0];
    }
}

module.exports = Indexable;