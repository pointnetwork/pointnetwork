const PointSDKController = require('./PointSDKController');
const File = require('../../db/models/file').default;
const DEFAULT_ENCODING = 'utf-8';
const {getFile, uploadData} = require('../../client/storage');
const config = require('config');
const detectContentType = require('detect-content-type');
const {pubsubPublish, pubsubSubscribe, identityToTopic, pubsubProcessMessage} = require('../../client/storage/ipfs');
const {signEncryptUploadForIdentityFromMe} = require('../../client/encryption');
const {
    hostStorageLen: _hostStorageLen,
    hostStorageGet: _hostStorageGet,
    hostStorageDir: _hostStorageDir,
    hostStorageModify, MODIFY_TYPE
} = require('../../client/hostStorage');
const {gzip} = require('../../util');
const {DisplayableError} = require('../../core/exceptions');
import {HOST_PREFIXED_PUBSUB_PROLOGUE, HOST_PREFIXED_PUBSUB_ENCSIGN_PROLOGUE} from '../../client/storage/config';

class StorageController extends PointSDKController {
    constructor(req) {
        super(req);

        this.req = req;
        this.config = config.get('zproxy');

        this.payload = req.body;
    }

    async getString() {
        const cid = this.req.params.id;
        const encoding = this.req.query.encoding ?? DEFAULT_ENCODING;

        const contents = (await getFile(cid, encoding)).toString(encoding);
        const contentType = detectContentType(Buffer.from(contents));
        return this._response(contents, {'content-type': contentType});
    }

    async putString() {
        const data = this.payload.data;
        if (data) {
            const id = await uploadData(data);
            return this._response(id);
        } else {
            return this._response(null);
        }
    }

    // Returns a single file metadata stored in the nodes leveldb
    async fileById() {
        const id = this.req.params.id;
        const file = await File.findOrFail(id);
        return this._response(file);
    }

    async pubsubPublish() {
        const {host} = this.req.headers;
        const topic = this.req.params.topic;
        if (!topic) throw new DisplayableError('Topic cannot be empty');
        const data = this.payload.data;
        const prefixedData = `${HOST_PREFIXED_PUBSUB_PROLOGUE}${host}|${data}`;
        pubsubPublish(topic, prefixedData);
        return this._response(null);
    }
    async pubsubPublishForIdentity() {
        const {host} = this.req.headers;

        let data = this.payload.data;
        if (!data) throw new DisplayableError('Data cannot be empty');

        const identity = this.payload.identity;
        if (!identity) throw new DisplayableError('Identity cannot be empty');

        const options = JSON.parse(this.payload.options || '{}');

        // Step 1. Gzip if needed
        if (options.gzip) {
            data = await gzip(data, true);
        }

        // Step 2. Encrypt and sign
        const encryptedAndSignedData = await signEncryptUploadForIdentityFromMe(host, data, identity, true);

        // Step 3. Prefix with host and prologue
        const prefixedData = `${HOST_PREFIXED_PUBSUB_PROLOGUE}${host}|${HOST_PREFIXED_PUBSUB_ENCSIGN_PROLOGUE}${encryptedAndSignedData}`;

        // Step 4. Publish
        const topic = identityToTopic(identity);
        pubsubPublish(topic, prefixedData);

        return this._response(null);
    }
    async pubsubSubscribe(callback) {
        const {host} = this.req.headers;
        const topic = this.req.params.topic;
        if (!topic) throw new DisplayableError('Topic cannot be empty');
        await pubsubSubscribe(topic, function(data) {
            pubsubProcessMessage(host, topic, data, false, callback);
        });
        return this._response(null);
    }
    async pubsubUnsubscribe() {
        const topic = this.req.params.topic;
        if (!topic) throw new DisplayableError('Topic cannot be empty');

        // todo
    }

    async hostStorageGet() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.query.data);
        const path = data.path;
        return this._response(await _hostStorageGet(host, path));
    }

    async hostStorageLen() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.query.data);
        const path = data.path;
        return this._response(await _hostStorageLen(host, path));
    }

    async hostStorageDir() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.query.data);
        const path = data.path;
        return this._response(await _hostStorageDir(host, path));
    }

    async hostStorageSet() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.body.data);
        const path = data.path;
        const value = data.value;
        return this._response(await hostStorageModify(host, path, value, MODIFY_TYPE.SET));
    }

    async hostStorageUnset() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.body.data);
        const path = data.path;
        return this._response(await hostStorageModify(host, path, null, MODIFY_TYPE.UNSET));
    }

    async hostStorageAppend() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.body.data);
        const path = data.path;
        const value = data.value;
        return this._response(await hostStorageModify(host, path, value, MODIFY_TYPE.APPEND));
    }

    async hostStorageInsertAt() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.body.data);
        const path = data.path;
        const value = data.value;
        const index = data.index;
        return this._response(await hostStorageModify(host, path, value, MODIFY_TYPE.INSERT_AT, index));
    }

    async hostStorageReplaceAt() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.body.data);
        const path = data.path;
        const value = data.value;
        const index = data.index;
        return this._response(await hostStorageModify(host, path, value, MODIFY_TYPE.REPLACE_AT, index));
    }

    async hostStorageRemoveAt() {
        const {host} = this.req.headers;
        const data = JSON.parse(this.req.body.data);
        const path = data.path;
        const index = data.index;
        return this._response(await hostStorageModify(host, path, null, MODIFY_TYPE.REMOVE_AT, index));
    }
}

module.exports = StorageController;
