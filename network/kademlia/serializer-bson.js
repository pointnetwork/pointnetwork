const bsonRPC = require('./bson-rpc');
const uuid = require('uuid');
const merge = require('merge');
const BSON = require('./good-bson');

class SerializerBSON {
    static serializer([object, sender, receiver], callback) {
        let message = bsonRPC.parseObject(
            merge({ jsonrpc: '2.0', id: uuid() }, object)
        );
        let notification = bsonRPC.notification('IDENTIFY', sender);

        switch (message.type) {
            case 'request':
            case 'error':
            case 'success':
                return callback(null, [
                    message.payload.id,
                    BSON.serialize([
                        message.payload,
                        notification
                    ]),
                    receiver
                ]);
            case 'invalid':
            case 'notification':
            default:
                return callback(new Error(`Invalid message type "${message.type}"`));
        }
    }
    static deserializer(buffer, callback) {
        let [message, notification] = bsonRPC.parse(buffer);

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