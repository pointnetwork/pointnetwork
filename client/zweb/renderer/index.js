let Twig = require('twig');
let moment = require('moment');
const fs = require('fs');
const path = require('path');
let { encryptPlainTextAndKey, decryptCipherTextAndKey } = require('../../encryptUtils');

// todo: maybe use twing nodule instead? https://github.com/ericmorand/twing

class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.zproxy;

        Twig.extend((Twig) => {
            Twig.exports.extendTag({
                    /**
                     * Block logic tokens.
                     *
                     *  Format: {% extends "template.twig" %}
                     */
                    type: Twig.logic.type.extends_,
                    regex: /^extends\s+(.+)$/,
                    next: [ ],
                    open: true,
                    compile: function (token) {
                        var expression = token.match[1].trim();
                        delete token.match;
                        token.stack = Twig.expression.compile.call(this, {
                            type:  Twig.expression.type.expression,
                            value: expression
                        }).stack;
                        return token;
                    },
                    parse: function (token, context, chain) {
                        var template,
                            that = this;

                        //innerContext = Twig.ChildContext(context);
                        // Twig.lib.copy = function (src) {
                        var innerContext = {};
                        let _key;
                        for (_key in context) {
                            if (Object.hasOwnProperty.call(context, _key)) {
                                innerContext[_key] = context[_key];
                            }
                        }

                        // Resolve filename
                        return Twig.expression.parseAsync.call(that, token.stack, context)
                            .then(function(file) {
                                if (file instanceof Twig.Template) {
                                    template = file;
                                } else {
                                    // Import file
                                    template = that.template.importFile(file);
                                }

                                // Set parent template
                                that.template.parentTemplate = file;

                                // Render the template in case it puts anything in its context
                                return template;
                            })
                            .then(function(template) {
                                return template.renderAsync(innerContext);
                            })
                            .then(function(renderedTemplate) {

                                // Extend the parent context with the extended context
                                context = {
                                    ...context,
                                    // override with anything in innerContext
                                    ...innerContext
                                };

                                return {
                                    chain: chain,
                                    output: ''
                                };
                            });
                    }
                },
            );

            Twig.exports.extendFunction("keyvalue_list", async(host, key) => {
                return await this.ctx.keyvalue.list(host, key);
            });
            Twig.exports.extendFunction("keyvalue_get", async(host, key) => {
                return await this.ctx.keyvalue.get(host, key);
            });
            Twig.exports.extendFunction("storage_get_by_ikv", async(identity, key) => {
                const fileKey = await this.ctx.web3bridge.getKeyValue(identity, key);
                return await this.ctx.client.storage.readFile(fileKey, 'utf-8');
            });
            Twig.exports.extendFunction("storage_get", async(key) => {
                return await this.ctx.client.storage.readFile(key, 'utf-8');
            });
            Twig.exports.extendFunction("storage_put", async(content) => {
                const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
                this.ctx.utils.makeSurePathExists(cache_dir);
                const tmpPostDataFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(content));
                fs.writeFileSync(tmpPostDataFilePath, content);
                let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
                return uploaded.id;
            });
            Twig.exports.extendFunction("encrypt_data", async(host, recipient, data) => {
                let publicKey = await this.ctx.web3bridge.getKeyValue(recipient, 'public_key')
                const encryptionResult = await encryptPlainTextAndKey(host, data, publicKey);
                return encryptionResult
            });
            Twig.exports.extendFunction("identity_by_owner", async(owner) => {
                return await this.ctx.web3bridge.identityByOwner(owner);
            });
            Twig.exports.extendFunction("email_identity_by_owner", async(owner) => {
                return await this.ctx.web3bridge.emailIdentityByOwner(owner);
            });
            Twig.exports.extendFunction("identity_ikv_get", async(identity, key) => {
                return await this.ctx.web3bridge.getKeyValue(identity, key);
            });
            Twig.exports.extendFunction("contract_get", async(target, contractName, method, params) => {
                return await this.ctx.web3bridge.callContract(target, contractName, method, params);
            });
            Twig.exports.extendFunction("contract_call", async(host, contractName, methodName, params) => {
                return await this.ctx.web3bridge.sendContract(host.replace('.z', ''), contractName, methodName, params);
            });
            Twig.exports.extendFunction("retrieve_mail", async(owner, host, contractName, event) => {
                const { privateKey } = this.ctx.wallet.config;
                const events = await this.ctx.web3bridge.getPastEvents(host.replace('.z', ''), contractName, event, 0, 'latest');
                const emails = await Promise.all(events.map(async (event)=> {
                    if (owner === event.returnValues.to) {
                        return await this.decryptData(
                            host,
                            event.returnValues.from,
                            privateKey,
                            event.returnValues.encryptedSymmetricKey,
                            event.returnValues.encryptedMessageHash
                        )
                    }
                }))
                return emails;
            });
            Twig.exports.extendFunction("decrypt_email", async(host, owner, encryptedData) => {
                const { privateKey } = this.ctx.wallet.config;
                const recipient = encryptedData['1']
                const from = encryptedData['0']
                const messageid = encryptedData['2']
                const encryptedSymmetricKey = encryptedData['3']

                if (owner === recipient) {
                    let message = await this.decryptData(host,privateKey,encryptedSymmetricKey,messageid)
                    return { messageid, from, message }
                }
            });
            Twig.exports.extendFunction("default_wallet_address", async(id, passcode) => {
                return this.ctx.config.client.wallet.account;
            });
            Twig.exports.extendFunction("is_authenticated", async(auth) => {
                return auth.walletid != undefined
            });
            Twig.exports.extendFunction("contract_list", async(target, contractName, method) => {
                let i = 0;
                let results = [];
                while(true) {
                    try {
                        results.push(await this.ctx.web3bridge.callContract(target, contractName, method, [i]));
                    } catch(e) {
                        // todo: only if the error is related to the array bound? how can we standardize this?
                        break;
                    }

                    i++;

                    if (i > 50000) {
                        throw new Error('Something went wrong, more than 50000 iterations'); // todo
                    }
                }
                return results;
            });

            Twig.exports.extendFilter('unjson', function(value) {
                return JSON.parse(value);
            });

            Twig.Templates.registerLoader('fs', async(location, params, callback, error_callback/*todo*/) => {
                // console.log({location, params});
                // ... load the template ...
                const src = await this.fetchTemplateByHash(params.path);
                params.data = src;
                // todo: params.id?
                params.allowInlineIncludes = true;
                // create and return the template
                var template = new Twig.Template(params);
                if (typeof callback === 'function') {
                    callback(template);
                }
                // console.log(template);
                return template;
            });
        });
    }

    async render(template_contents, host, request_params = {}) {
        let template = Twig.twig({
            // id // todo
            allowInlineIncludes: true,
            autoescape: true,
            strict_variables: true,
            data: template_contents,
            async: true, // todo
        });
        let variables = {
            host
        };
        variables = Object.assign({}, variables, request_params);

        let result = await template.renderAsync(variables);
        return result.toString();
    }

    async fetchTemplateByHash(hash) {
        console.log('fetching '+hash);
        return await this.ctx.client.storage.readFile(hash, 'utf-8');
    }

    async decryptData(host, privateKey, unparsedEncryptedSymmetricKey, cid) {
        const encryptedSymmetricKey = JSON.parse(unparsedEncryptedSymmetricKey)
        const encryptedSymmetricObj = {}
        for (const k in encryptedSymmetricKey) {
            encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricKey[k], 'hex')
        }
        const encryptedData = await this.ctx.client.storage.readFile(cid, 'utf-8')
        const decryptedData = await decryptCipherTextAndKey(host, Buffer.from(encryptedData, 'hex'), encryptedSymmetricObj, privateKey)
        return decryptedData.plaintext.toString()
    }
}

module.exports = Renderer;