let TwigLib = require('twig');
let moment = require('moment');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
let { encryptData, decryptData } = require('../../encryptIdentityUtils');
const utils = require('#utils');

// todo: maybe use twing nodule instead? https://github.com/ericmorand/twing

class Renderer {
    #twigs = {};
    #twigs_use_counter = {};

    constructor(ctx, rootDir) {
        this.ctx = ctx;
        this.config = ctx.config.client.zproxy;
        this.rootDir = rootDir;
    }

    async render(template_id, template_contents, host, request_params = {}) {
        try {
            const Twig = this.#getTwigForHost(host);

            let template = Twig.twig({
                id: host + '/' + template_id,
                allowInlineIncludes: true,
                autoescape: true,
                strict_variables: true,
                data: template_contents,
                async: true, // todo
                rethrow: true, // makes twig stop and dump full message to us, and from us into the browser instead of just logging it into the console
            });

            // Here we can specify global variables to pass into twig
            let variables = {
                host
            };
            variables = Object.assign({}, variables, {request: request_params});

            let result = await template.renderAsync(variables);

            // Okay, we shouldn't be nuking our Twig cache each time, but I figured it's better if we suffer on performance a bit,
            // than have a memory leak with thousands of Twig objects in memory waiting
            this.#removeTwigForHost(host);

            return result.toString();
        } catch (e) {
            this.#removeTwigForHost(host);
            throw e;
        }
    }

    #defineAvailableFunctions() {
        // These functions will be available for zApps to call in ZHTML
        return {
            keyvalue_list: async function(host, key) {
                return await this.renderer.ctx.keyvalue.list(host, key);
            },
            keyvalue_get: async function(host, key) {
                return await this.renderer.ctx.keyvalue.get(host, key);
            },
            storage_get_by_ikv: async function(identity, key) {
                const fileKey = await this.renderer.ctx.web3bridge.getKeyValue(identity, key);
                return await this.renderer.ctx.client.storage.readFile(fileKey, 'utf-8');
            },
            storage_get: async function(key) {
                return await this.renderer.ctx.client.storage.readFile(key, 'utf-8');
            },
            storage_get_parsed: async function(key) {
                return await this.renderer.ctx.client.storage.readJSON(key, 'utf-8');
            },
            storage_put: async function(content) {
                const cache_dir = path.join(this.renderer.ctx.datadir, this.renderer.config.cache_path);
                utils.makeSurePathExists(cache_dir);
                const tmpPostDataFilePath = path.join(cache_dir, utils.hashFnUtf8Hex(content));
                fs.writeFileSync(tmpPostDataFilePath, content);
                let uploaded = await this.renderer.ctx.client.storage.putFile(tmpPostDataFilePath);
                return uploaded.id;
            },
            encrypt_data: async function(publicKey, data) {
                let host = this.host;
                return await encryptData(host, data, publicKey); // todo: make sure you're not encrypting on something stupid like 0x0 public key
            },
            decrypt_data: async function(encryptedData, unparsedEncryptedSymmetricObjJSON) {
                let host = this.host;
                const { privateKey } = this.renderer.ctx.wallet.config;

                const encryptedSymmetricObjJS = JSON.parse(unparsedEncryptedSymmetricObjJSON);
                const encryptedSymmetricObj = {};
                for (const k in encryptedSymmetricObjJS) {
                    encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricObjJS[k], 'hex');
                }
                const decryptedData = await decryptData(host, Buffer.from(encryptedData, 'hex'), encryptedSymmetricObj, privateKey);
                return decryptedData.plaintext.toString();
            },
            isHash: async function(str) {
                const s = (_.startsWith(str, '0x')) ? str.substr(2) : str;
                if (s.length !== 64) return false;
                return ((new RegExp("^[0-9a-fA-F]+$")).test(s));
            },
            identity_by_owner: async function(owner) {
                return await this.renderer.ctx.web3bridge.identityByOwner(owner);
            },
            owner_by_identity: async function(identity) {
                return await this.renderer.ctx.web3bridge.ownerByIdentity(identity);
            },
            public_key_by_identity: async function(identity) {
                return await this.renderer.ctx.web3bridge.commPublicKeyByIdentity(identity);
            },
            identity_ikv_get: async function(identity, key) {
                return await this.renderer.ctx.web3bridge.getKeyValue(identity, key);
            },
            contract_get: async function(target, contractName, method, params) {
                return await this.renderer.ctx.web3bridge.callContract(target, contractName, method, params);
            },
            contract_call: async function(host, contractName, methodName, params) {
                return await this.renderer.ctx.web3bridge.sendToContract(host.replace('.z', ''), contractName, methodName, params);
            },
            contract_events: async function(host, contractName, event, filter = {}) {
                const options = { filter, fromBlock: 1, toBlock: 'latest' };
                const events =  await this.renderer.ctx.web3bridge.getPastEvents(host.replace('.z', ''), contractName, event, options);
                // for(let ev of events) console.log(ev, ev.raw);

                const eventData = events.map((event) => (({ returnValues }) => ({ data: returnValues }))(event));
                return eventData;
            },
            default_wallet_address: async function(id, passcode) {
                return this.renderer.ctx.config.client.wallet.account;
            },
            is_authenticated: async function(auth) {
                return auth.walletid !== undefined;
            },
            contract_list: async function(target, contractName, method, params = []) {
                let i = 0;
                let results = [];
                while(true) {
                    try {
                        results.push(await this.renderer.ctx.web3bridge.callContract(target, contractName, method, params.concat([i])));
                    } catch(e) {
                        // todo: only if the error is related to the array bound? how can we standardize this.renderer?
                        break;
                    }

                    i++;

                    if (i > 50000) {
                        throw new Error('Something went wrong, more than 50000 iterations'); // todo
                    }
                }
                return results;
            },    
        };
    }

    #defineAvailableFilters() {
        return {
            unjson: function(value) {
                return JSON.parse(value);
            }
        };
    }

    async fetchTemplateByPath(templatePath) {
        return await this.rootDir.readFileByPath(templatePath, 'utf-8');
    }

    #getTwigForHost(host) {
        // Increment use counter
        this.#twigs_use_counter[host] = this.#twigs_use_counter[host] + 1 || 0;

        // Look in cache first
        if (this.#twigs[host]) {
            return this.#twigs[host];
        }

        // Spawning a new Twig object
        const Twig = TwigLib.factory();

        Twig.host = host;

        Twig.extend((ExtTwig) => {
            ExtTwig.host = host;
            ExtTwig.renderer = this;

            this.#connectExtendsTagToPointStorage(ExtTwig);
            this.#connectIncludeTagToPointStorage(ExtTwig);
            
            for(let [name, fn] of Object.entries( this.#defineAvailableFunctions() ))
                ExtTwig.exports.extendFunction(name, fn.bind(ExtTwig));

            for(let [name, fn] of Object.entries( this.#defineAvailableFilters() ))
                ExtTwig.exports.extendFilter(name, fn.bind(ExtTwig));

            this.#registerPointStorageFsLoader(ExtTwig);
        });

        // Save to our cache
        this.#twigs[host] = Twig;

        return Twig;
    }

    #removeTwigForHost(host) {
        this.#twigs_use_counter[host]--;

        if (this.#twigs_use_counter[host] === 0) {
            delete this.#twigs[host];
        }
    }

    #connectExtendsTagToPointStorage(Twig) {
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
        });
    }

    #connectIncludeTagToPointStorage(Twig) {
        // Include tag - use Point Storage
        Twig.exports.extendTag({
            /**
             * Block logic tokens.
             *
             *  Format: {% includes "template.twig" [with {some: 'values'} only] %}
             */
            type: Twig.logic.type.include,
            regex: /^include\s+(.+?)(?:\s|$)(ignore missing(?:\s|$))?(?:with\s+([\S\s]+?))?(?:\s|$)(only)?$/,
            next: [],
            open: true,
            compile(token) {
                const {match} = token;
                const expression = match[1].trim();
                const ignoreMissing = match[2] !== undefined;
                const withContext = match[3];
                const only = ((match[4] !== undefined) && match[4].length);

                delete token.match;

                token.only = only;
                token.ignoreMissing = ignoreMissing;

                token.stack = Twig.expression.compile.call(this, {
                    type: Twig.expression.type.expression,
                    value: expression
                }).stack;

                if (withContext !== undefined) {
                    token.withStack = Twig.expression.compile.call(this, {
                        type: Twig.expression.type.expression,
                        value: withContext.trim()
                    }).stack;
                }

                return token;
            },
            parse(token, context, chain) {
                // Resolve filename
                let innerContext = token.only ? {} : {...context};
                const {ignoreMissing} = token;
                const state = this;
                let promise = null;
                const result = {chain, output: ''};

                if (typeof token.withStack === 'undefined') {
                    promise = Twig.Promise.resolve();
                } else {
                    promise = Twig.expression.parseAsync.call(state, token.withStack, context)
                        .then(withContext => {
                            innerContext = {
                                ...innerContext,
                                ...withContext
                            };
                        });
                }

                return promise
                    .then(() => {
                        return Twig.expression.parseAsync.call(state, token.stack, context);
                    })
                    .then(file => {
                        let files;
                        if (Array.isArray(file)) {
                            files = file;
                        } else {
                            files = [file];
                        }
                        return files;
                    })
                    .then(files => {
                        return files.reduce(async(previousPromise, file) => {
                            let acc = await previousPromise;

                            let tryToRender = async(file) => {
                                if (acc.render === null) {
                                    if (file instanceof Twig.Template) {
                                        const res = {
                                            render: await file.renderAsync(
                                                innerContext,
                                                {
                                                    isInclude: true
                                                }
                                            ),
                                            lastError: null
                                        };
                                        return res;
                                    }

                                    try {
                                        const res = {
                                            render: await (await state.template.importFile(file)).renderAsync(
                                                innerContext,
                                                {
                                                    isInclude: true
                                                }
                                            ),
                                            lastError: null
                                        };
                                        return res;
                                    } catch (error) {
                                        return {
                                            render: null,
                                            lastError: error
                                        };
                                    }
                                }

                                return acc;
                            };

                            return await tryToRender(file);

                        }, {render: null, lastError: null});
                    })
                    .then(finalResultReduce => {

                        if (finalResultReduce.render !== null) {
                            return finalResultReduce.render;
                        }

                        if (finalResultReduce.render === null && ignoreMissing) {
                            return '';
                        }

                        throw finalResultReduce.lastError;
                    })
                    .then(output => {
                        if (output !== '') {
                            result.output = output;
                        }

                        return result;
                    });
            }
        });
    }

    #registerPointStorageFsLoader(Twig) {
        Twig.Templates.registerLoader('fs', async(location, params, callback, error_callback/*todo*/) => {
            // console.log({location, params});
            // ... load the template ...
            const src = await this.fetchTemplateByPath(params.path);
            params.data = src;
            params.allowInlineIncludes = true;
            // create and return the template
            var template = new Twig.Template(params);
            if (typeof callback === 'function') {
                callback(template);
            }
            return template;
        });
    }

}

module.exports = Renderer;