const originalBSON = require('bson');

const BSON = {};

for (const i in originalBSON) {
    BSON[i] = originalBSON[i];
}

BSON.serialize = (a, ...b) => originalBSON.serialize({_: a}, b);

BSON.deserialize = (...a) => {
    const deserialized = originalBSON.deserialize(...a, {promoteBuffers: true});
    return deserialized['_'];
};

module.exports = BSON;
