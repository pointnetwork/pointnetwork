const TwigLib = require('twig');
const _ = require('lodash');
const {encryptData, decryptData} = require('../../encryptIdentityUtils');
const {getFile, getJSON, getFileIdByPath, uploadFile} = require('../../storage');
const config = require('config');
const logger = require('../../../core/log');
const log = logger.child({module: 'Renderer'});

// todo: maybe use twing nodule instead? https://github.com/ericmorand/twing

class Renderer {
    #twigs = {};
    #twigs_use_counter = {};

    constructor(ctx, {rootDirId, localDir}) {
        this.ctx = ctx;
        this.config = config.get('zproxy');
        this.rootDirId = rootDirId;
        this.localDir = localDir;
    }

    async render(template_id, template_contents, host, request_params = {}) {
        try {
            const Twig = this.#getTwigForHost(host);

            const template = Twig.twig({
                id: host + '/' + template_id,
                allowInlineIncludes: true,
                autoescape: true,
                strict_variables: true,
                data: template_contents,
                async: true, // todo
                rethrow: true // makes twig stop and dump full message to us, and from us into the browser instead of just logging it into the console
            });

            // Here we can specify global variables to pass into twig
            let variables = {host};
            variables = Object.assign({}, variables, {request: request_params});

            const result = await template.renderAsync(variables);

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
            keyvalue_list: async function (host, key) {
                return await this.renderer.ctx.keyvalue.list(host, key);
            },
            keyvalue_get: async function (host, key) {
                return await this.renderer.ctx.keyvalue.get(host, key);
            },
            storage_get_by_ikv: async function(identity, key) {
                try {
                    const fileKey = await this.renderer.ctx.web3bridge.getKeyValue(identity, key);
                    log.debug({identity, key, fileKey}, 'storage_get_by_ikv'); // TODO: logger doesn't work here
                    return await getFile(fileKey);
                } catch (e) {
                    log.error({identity, key, ...e}, 'storage_get_by_ikv error');
                    return 'Invalid Content';
                }
            },
            storage_get: async function (key) {
                try {
                    return await getFile(key);
                } catch (e) {
                    return 'Invalid Content';
                }
            },
            storage_get_parsed: async function (key) {
                return await getJSON(key);
            },
            storage_put: async function (content) {
                return uploadFile(content);
            },
            encrypt_data: async function (publicKey, data) {
                const host = this.host;
                return await encryptData(host, data, publicKey); // todo: make sure you're not encrypting on something stupid like 0x0 public key
            },
            decrypt_data: async function (encryptedData, unparsedEncryptedSymmetricObjJSON) {
                const host = this.host;
                const privateKey = this.renderer.ctx.wallet.getNetworkAccountPrivateKey();

                const encryptedSymmetricObjJS = JSON.parse(unparsedEncryptedSymmetricObjJSON);
                const encryptedSymmetricObj = {};
                for (const k in encryptedSymmetricObjJS) {
                    encryptedSymmetricObj[k] = Buffer.from(encryptedSymmetricObjJS[k], 'hex');
                }
                const decryptedData = await decryptData(
                    host,
                    Buffer.from(encryptedData, 'hex'),
                    encryptedSymmetricObj,
                    privateKey
                );
                return decryptedData.plaintext.toString();
            },
            isHash: async function (str) {
                const s = _.startsWith(str, '0x') ? str.substr(2) : str;
                if (s.length !== 64) return false;
                return new RegExp('^[0-9a-fA-F]+$').test(s);
            },
            identity_by_owner: async function (owner) {
                return await this.renderer.ctx.web3bridge.identityByOwner(owner);
            },
            owner_by_identity: async function (identity) {
                return await this.renderer.ctx.web3bridge.ownerByIdentity(identity);
            },
            public_key_by_identity: async function (identity) {
                return await this.renderer.ctx.web3bridge.commPublicKeyByIdentity(identity);
            },
            identity_ikv_get: async function (identity, key) {
                return await this.renderer.ctx.web3bridge.getKeyValue(identity, key);
            },
            contract_get: async function (target, contractName, method, params) {
                return await this.renderer.ctx.web3bridge.callContract(
                    target,
                    contractName,
                    method,
                    params
                );
            },
            contract_call: async function (host, contractName, methodName, params) {
                return await this.renderer.ctx.web3bridge.sendToContract(
                    host.replace('.z', ''),
                    contractName,
                    methodName,
                    params
                );
            },
            all_contract_instance_data: async function(host) {
                const eventData = [];
                // TODO: load from IKV / Contract Registry
                const instances = ['0x420126709199a6e6C91550C4e06Fc62B595f357A', '0x97CB9eFe7a18f4619e7Bb2d50c7fB729DbEfC59b'];
                for(const address of instances) {
                    log.debug(`**** getting events from address: ${address}`);
                    const options = {fromBlock: 1, toBlock: 'latest', address};
                    const events = await this.renderer.ctx.web3bridge.getPastEventsAt(
                        host.replace('.z', ''),
                        'Twitter',
                        address,
                        'StorageEvent',
                        options
                    );
                    for (const ev of events) {
                        eventData.push({data: ev.returnValues});
                    }
                }
                return eventData;
            },
            contract_events: async function (host, contractName, event, filter = {}) {
                //delete keys property inserted by twig
                if (filter.hasOwnProperty('_keys')) delete filter['_keys'];

                const options = {filter, fromBlock: 1, toBlock: 'latest'};
                const events = await this.renderer.ctx.web3bridge.getPastEvents(
                    host.replace('.z', ''),
                    contractName,
                    event,
                    options
                );
                let eventData = [];
                for (const ev of events) {
                    //console.log(ev, ev.raw);
                    const eventTimestamp = await this.renderer.ctx.web3bridge.getBlockTimestamp(
                        ev.blockNumber
                    );

                    eventData.push({
                        data: ev.returnValues,
                        timestamp: eventTimestamp
                    });
                }

                //filter non-indexed properties from return value for convenience
                if (Object.keys(filter).length > 0) {
                    for (const k in filter) {
                        eventData = eventData.filter(e => e.data[k] === filter[k]);
                    }
                }

                return eventData;
            },
            default_wallet_address: async function () {
                return this.renderer.ctx.wallet.getNetworkAccount();
            },
            is_authenticated: async function (auth) {
                return auth.walletid !== undefined;
            },
            contract_list: async function (target, contractName, method, params = []) {
                let i = 0;
                const results = [];
                while (true) {
                    try {
                        results.push(
                            await this.renderer.ctx.web3bridge.callContract(
                                target,
                                contractName,
                                method,
                                params.concat([i])
                            )
                        );
                    } catch (e) {
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

            is_identity_registered: async function () {
                return await this.renderer.ctx.web3bridge.isCurrentIdentityRegistered();
            },
            get_current_identity: async function () {
                return await this.renderer.ctx.web3bridge.getCurrentIdentity();
            },
            identity_check_availability: async function (identity) {
                const owner = await this.renderer.ctx.web3bridge.ownerByIdentity(identity);
                log.debug({identity, owner}, 'identity_check_availability');
                if (!owner || owner === '0x0000000000000000000000000000000000000000') return true;
                return false;
            },

            csrf_value: async function () {
                // todo: regenerate per session, or maybe store more permanently?
                if (!this.renderer.ctx.csrf_tokens) this.renderer.ctx.csrf_tokens = {};
                if (!this.renderer.ctx.csrf_tokens[this.host])
                    this.renderer.ctx.csrf_tokens[this.host] = require('crypto')
                        .randomBytes(64)
                        .toString('hex');
                return this.renderer.ctx.csrf_tokens[this.host];
            },
            csrf_field: async function () {
                // todo: regenerate per session, or maybe store more permanently?
                if (!this.renderer.ctx.csrf_tokens) this.renderer.ctx.csrf_tokens = {};
                if (!this.renderer.ctx.csrf_tokens[this.host])
                    this.renderer.ctx.csrf_tokens[this.host] = require('crypto')
                        .randomBytes(64)
                        .toString('hex');
                return (
                    '<input name=\'_csrf\' value=\'' + this.renderer.ctx.csrf_tokens[this.host] + ' />'
                );
            },
            csrf_guard: async function (submitted_token) {
                if (!this.renderer.ctx.csrf_tokens)
                    throw new Error(
                        'No csrf token generated for this host (rather, no tokens at all)'
                    );
                if (!this.renderer.ctx.csrf_tokens[this.host])
                    throw new Error('No csrf token generated for this host');
                const real_token = this.renderer.ctx.csrf_tokens[this.host];
                if (real_token !== submitted_token) {
                    throw new Error('Invalid csrf token submitted');
                }
                return '';
            },

            // Privileged access functions (only scoped to https://point domain)

            get_wallet_info: async function() {
                this.renderer.#ensurePrivilegedAccess();

                const walletService = this.renderer.ctx.wallet;

                const wallets = [];
                wallets.push({
                    currency_name: 'Point',
                    currency_code: 'POINT',
                    address:
                        (await this.renderer.ctx.web3bridge.getCurrentIdentity()) + '.point' ||
                        'N/A',
                    balance: 0
                });
                wallets.push({
                    currency_name: 'Solana',
                    currency_code: 'SOL',
                    address: walletService.getSolanaAccount(),
                    balance: await walletService.getSolanaMainnetBalanceInSOL()
                });
                wallets.push({
                    currency_name: 'Solana - Devnet',
                    currency_code: 'devSOL',
                    address: walletService.getSolanaAccount(),
                    balance: await walletService.getSolanaDevnetBalanceInSOL()
                });
                wallets.push({
                    currency_name: 'Neon',
                    currency_code: 'NEON',
                    address: walletService.getNetworkAccount(),
                    balance: await walletService.getNetworkAccountBalanceInEth()
                });
                return wallets;
            },
            get_wallet_history: async function(code) {
                this.renderer.#ensurePrivilegedAccess();
                return await this.renderer.ctx.wallet.getHistoryForCurrency(code);
            },
            wallet_request_dev_sol: async function() {
                this.renderer.#ensurePrivilegedAccess();
                await this.renderer.ctx.wallet.initiateSolanaDevAirdrop();
            },
            wallet_send: async function(code, recipient, amount) {
                this.renderer.#ensurePrivilegedAccess();
                await this.renderer.ctx.wallet.send(code, recipient, amount);
            },
            identity_register: async function(identity) {
                this.renderer.#ensurePrivilegedAccess();

                const publicKey = this.renderer.ctx.wallet.getNetworkAccountPublicKey();
                const owner = this.renderer.ctx.wallet.getNetworkAccount();

                log.info(
                    {
                        identity,
                        owner,
                        publicKey,
                        len: Buffer.byteLength(publicKey, 'utf-8'),
                        parts: [
                            `0x${publicKey.slice(0, 32)}`,
                            `0x${publicKey.slice(32)}`
                        ]
                    },
                    'Registering a new identity'
                );

                await this.renderer.ctx.web3bridge.registerIdentity(
                    identity,
                    owner,
                    Buffer.from(publicKey, 'hex')
                );

                log.info(
                    {identity, owner, publicKey: publicKey.toString('hex')},
                    'Successfully registered new identity'
                );

                return true;
            }
        };
    }

    #ensurePrivilegedAccess() {
        if (this.host !== 'point')
            throw new Error('This function requires privileged access, host is not supported');
    }

    #defineAvailableFilters() {
        return {
            unjson: function (value) {
                return JSON.parse(value);
            }
        };
    }

    // TODO: this is a temporary hack unless we are using LocalDirectory, but
    // already got rid of Directory model
    async fetchTemplateByPath(templatePath) {
        if (this.rootDirId) {
            const templateFileId = await getFileIdByPath(this.rootDirId, templatePath);
            return getFile(templateFileId, 'utf8');
        } else {
            return this.localDir.readFileByPath(templatePath, 'utf-8');
        }
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

        Twig.extend(ExtTwig => {
            ExtTwig.host = host;
            ExtTwig.renderer = this;
            ExtTwig.renderer.host = host;

            this.#connectExtendsTagToPointStorage(ExtTwig);
            this.#connectIncludeTagToPointStorage(ExtTwig);

            for (const [name, fn] of Object.entries(this.#defineAvailableFunctions()))
                ExtTwig.exports.extendFunction(name, fn.bind(ExtTwig));

            for (const [name, fn] of Object.entries(this.#defineAvailableFilters()))
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
            next: [],
            open: true,
            compile: function (token) {
                var expression = token.match[1].trim();
                delete token.match;
                token.stack = Twig.expression.compile.call(this, {
                    type: Twig.expression.type.expression,
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
                return Twig.expression.parseAsync
                    .call(that, token.stack, context)
                    .then(function (file) {
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
                    .then(function (template) {
                        return template.renderAsync(innerContext);
                    })
                    .then(function () {
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
                const only = match[4] !== undefined && match[4].length;

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
                    promise = Twig.expression.parseAsync
                        .call(state, token.withStack, context)
                        .then(withContext => {
                            innerContext = {
                                ...innerContext,
                                ...withContext
                            };
                        });
                }

                return promise
                    .then(() => Twig.expression.parseAsync.call(state, token.stack, context))
                    .then(file => {
                        let files;
                        if (Array.isArray(file)) {
                            files = file;
                        } else {
                            files = [file];
                        }
                        return files;
                    })
                    .then(files => files.reduce(async (previousPromise, file) => {
                        const acc = await previousPromise;

                        const tryToRender = async file => {
                            if (acc.render === null) {
                                if (file instanceof Twig.Template) {
                                    const res = {
                                        render: await file.renderAsync(
                                            innerContext,
                                            {isInclude: true}
                                        ),
                                        lastError: null
                                    };
                                    return res;
                                }

                                try {
                                    const res = {
                                        render: await (
                                            await state.template.importFile(file)
                                        ).renderAsync(innerContext, {isInclude: true}),
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
                    }, {render: null, lastError: null}))
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
        Twig.Templates.registerLoader(
            'fs',
            async (location, params, callback) => {
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
            }
        );
    }
}

module.exports = Renderer;
