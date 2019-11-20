let originalBSON = require('bson');

let BSON = {};

for(let i in originalBSON) {
    BSON[i] = originalBSON[i];
}

BSON.serialize = (a, ...b) => {
    return originalBSON.serialize({"_":a}, b)
};

BSON.deserialize = (...a) => {
    const deserialized = originalBSON.deserialize(...a, {promoteBuffers: true});
    return deserialized["_"];
};

module.exports = BSON;