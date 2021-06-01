let Twig = require('twig');
let moment = require('moment');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
let { encryptPlainTextAndKey, decryptCipherTextAndKey } = require('../../encryptUtils');

// todo: maybe use twing nodule instead? https://github.com/ericmorand/twing

class Renderer {
    constructor(ctx, rootDir) {
        this.ctx = ctx;
        this.config = ctx.config.client.zproxy;
        this.rootDir = rootDir;

        // Reset Twig cache
        // Twig.Templates.registry = {};

        console.log(Twig.extend.toString());
        Twig.extend((Twig) => {
            console.log(Twig.Templates);
            
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
                        console.log({token, context, chain});
                        var template,
                            that = this;

                        var host = context.host;

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
            Twig.exports.extendFunction("contract_events", async(host, contractName, event, filter = {}) => {
                const options = { filter,
                                  fromBlock: 0,
                                  toBlock: 'latest'}
                const events =  await this.ctx.web3bridge.getPastEvents(host.replace('.z', ''), contractName, event, options);
                const eventData = events.map((event) =>
                (({ returnValues }) => ({ data: returnValues }))(event))
                return eventData
            });
            Twig.exports.extendFunction("decrypt_data", async(host, encryptedData, encryptedSymmetricKey) => {
                const { privateKey } = this.ctx.wallet.config;
                return await this.decryptData(host,privateKey,encryptedSymmetricKey,encryptedData)
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
                const src = await this.fetchTemplateByPath(params.path);
                params.data = src;
                console.log('---------------------------------')
                console.log({location, params, callback});
                params.id = 's'+Math.random() + '';
                params.allowInlineIncludes = true;
                // create and return the template
                var template = new Twig.Template(params);
                if (typeof callback === 'function') {
                    callback(template);
                }
                console.log({template});
                return template;
            });
        });
    }

    async render(template_id, template_contents, host, request_params = {}) {
        console.log(Twig.cache);
        Twig.cache(false);
        // Twig.cache = false;
        let template = Twig.twig({
            id: host + '/' + template_id,
            allowInlineIncludes: true,
            autoescape: true,
            strict_variables: true,
            data: template_contents,
            async: true, // todo
        });
        console.log(template);

        // Here we can specify global variables to pass into twig
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

    async fetchTemplateByPath(templatePath) {
        console.log('fetching '+templatePath); // todo: remove

        // example: https://blog.z/layout.zhtml
        if (templatePath.includes('..')) throw Error('template path cannot contain invalid fragments'); // to not allow to go higher than the domain scope

        // make sure it's the same directory
        // if (!this.rootDir.host) throw Error('fetchTemplateByPath failed: no host set for rootDir');
        // if (! (_.startsWith(templatePath, `${this.rootDir.host}/`))) throw Error('fetchTemplateByPath failed: template host doesnt match root dir host');
        //
        // const templatePathWithoutHost = templatePath.replace(`${this.rootDir.host}/`, '');
        const templatePathWithoutHost = templatePath;

        return await this.rootDir.readFileByPath(templatePathWithoutHost, 'utf-8');
    }

    async decryptData(host, privateKey, unparsedEncryptedSymmetricKey, encryptedData) {
        const encryptedSymmetricKey = JSON.parse(unparsedEncryptedSymmetricKey)
        const encryptedSymmetricObj = {}
        for (const k in encryptedSymmetricKey) {
            encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricKey[k], 'hex')
        }
        const decryptedData = await decryptCipherTextAndKey(host, Buffer.from(encryptedData, 'hex'), encryptedSymmetricObj, privateKey)
        return decryptedData.plaintext.toString()
    }
}

module.exports = Renderer;