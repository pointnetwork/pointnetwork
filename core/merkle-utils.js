// This is a modified version of https://www.npmjs.com/package/merkle-lib
// Modified to defend merkle trees from second preimage attack
// todo: check the code properly again, not convinced it's working correctly. is it really impossible to just put a preimage into an odd position as data?

const origMerkle = require('merkle-lib');

const merkleUtils = {
    // returns the merkle tree
    merkle: function (values, digestFn) {
        if (!Array.isArray(values)) throw TypeError('Expected values Array');
        if (typeof digestFn !== 'function') throw TypeError('Expected digest Function');

        // if (values.length === 1) return values.concat() // We don't do this because we would mess up format length

        const levels = [values];
        let level = values;
        let initial_iteration = true;

        do {
            level = merkleUtils._derive(level, digestFn, initial_iteration);
            levels.push(level);
            initial_iteration = false;
        } while (level.length > 1);

        return [].concat.apply([], levels);
    },

    // returns an array of hashes of length: values.length / 2 + (values.length % 2)
    _derive: function (values, digestFn, initial_iteration) {
        const length = values.length;
        const results = [];

        for (let i = 0; i < length; i += 2) {
            const left = values[i];
            const right = i + 1 === length ? left : values[i + 1];
            const data = initial_iteration
                ? Buffer.concat([Buffer.from([0x00]), left, right])
                : Buffer.concat([left, right]);

            results.push(digestFn(data));
        }

        return results;
    }
};

module.exports = merkleUtils;
