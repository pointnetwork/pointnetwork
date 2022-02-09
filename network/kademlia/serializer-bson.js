const bsonRPC = require('./bson-rpc');
const merge = require('merge');
const BSON = require('./good-bson');
const {v4: uuid} = require('uuid');

class SerializerBSON {
    static serializer([object, sender, receiver], callback) {
        const message = bsonRPC.parseObject(merge({jsonrpc: '2.0', id: uuid()}, object));
        const notification = bsonRPC.notification('IDENTIFY', sender);

        switch (message.type) {
            case 'request':
            case 'error':
            case 'success':
                return callback(null, [
                    message.payload.id,
                    BSON.serialize([message.payload, notification]),
                    receiver
                ]);
            case 'invalid':
            case 'notification':
            default:
                return callback(new Error(`Invalid message type "${message.type}"`));
        }
    }
    static deserializer(buffer, callback) {
        const [message, notification] = bsonRPC.parse(buffer);

        switch (message.type) {
            case 'request':
            case 'error':
            case 'success':
                return callback(null, [message, notification]);
            case 'invalid':
            case 'notification':
            default:
                return callback(new Error(`Invalid message type "${message.type}"`));
        }
    }
}

module.exports = SerializerBSON;
