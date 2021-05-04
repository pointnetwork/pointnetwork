let Twig = require('twig');
let moment = require('moment');

// todo: maybe use twing nodule instead? https://github.com/ericmorand/twing

class Renderer {
    constructor(ctx) {
        this.ctx = ctx;

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
            Twig.exports.extendFunction("load_wallet", async(id, passcode) => {
                return await this.ctx.wallet.loadWalletFromKeystore(id, passcode);
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
}

module.exports = Renderer;