const http = require('http');
const NodeSession = require('node-session')
const _ = require('lodash');
const fs = require('fs');
const Renderer = require('../zweb/renderer');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const mime = require('mime-types');
const sanitizingConfig = require('./sanitizing-config');
const crypto = require('crypto')
const eccrypto = require("eccrypto");

class ZProxy {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.zproxy;
        this.port = parseInt(this.config.port); // todo: put default if null/void
        this.host = this.config.host;
        this.web3 = this.ctx.network.web3
    }

    async start() {
        this.server = http.createServer(this.request.bind(this));
        this.server.listen(this.port, this.host);
        this.ctx.log.info(`ZProxy server listening on ${ this.host }:${ this.port }`);
    }

    abort404(response, message = 'domain not found') {
        const headers = {};
        response.writeHead(404, headers);
        response.write('404 '+message); // todo: come on, write a better msg
        response.end();
    }

    abortError(response, err) {
        const headers = {};
        response.writeHead(500, headers);
        response.write('500: '+err); // todo: come on, write a better msg
        response.end();
    }

    async request(request, response) {
        // console.log(request);
        // Using node-session here to avoid re-write to ExpressJS or Fastify for now
        // https://www.npmjs.com/package/node-session
        this.session = new NodeSession({secret: '24tL7rQrHcXPxNevZdFyvNi8RyLGE3jf'})
        this.session.startSession(request, response, () => {})

        // console.log(request);
        // console.log(request.headers);
        let host = request.headers.host;
        // console.log(host);
        if (! _.endsWith(host, '.z')) return this.abort404(response);

        try {
            let rendered;

            let parsedUrl;
            // console.log(request);
            try {
                parsedUrl = new URL(request.url, `http://${request.headers.host}`);
            } catch(e) {
                parsedUrl = { pathname: '/error' }; // todo
            }

            console.debug(parsedUrl); // todo: remove
            let contentType = 'text/html';
            if (_.startsWith(parsedUrl.pathname, '/_storage/')) {
                let hash = parsedUrl.pathname.replace('/_storage/', '');
                let hashWithoutExt = hash.split('.').slice(0, -1).join('.');
                let ext = hash.split('.').slice(-1);
                if (ext !== hashWithoutExt) {
                    contentType = this.getContentTypeFromExt(ext);
                    if (contentType.includes('html')) contentType = 'text/html'; // just in case
                }
                rendered = await this.ctx.client.storage.readFile(hashWithoutExt); // todo: what if doesn't exist?
            } else if (_.startsWith(parsedUrl.pathname, '/_keyvalue_append/')) {
                try {
                    rendered = await this.keyValueAppend(host, request);
                } catch(e) {
                    return this.abortError(response, e);
                }
            } else if (_.startsWith(parsedUrl.pathname, '/_contract_send/')) {
                try {
                    rendered = await this.contractSend(host, request);
                } catch(e) {
                    return this.abortError(response, e);
                }
            }
              else if (_.startsWith(parsedUrl.pathname, '/_auth/')) {
                try {
                    rendered = await this.auth(host, request);
                } catch(e) {
                    return this.abortError(response, e);
                }
            }
              else if (_.startsWith(parsedUrl.pathname, '/_signout/')) {
                try {
                    rendered = await this.signOut(host, request);
                } catch(e) {
                    return this.abortError(response, e);
                }
            } else if (_.startsWith(parsedUrl.pathname, '/_encrypt_send/')) {
                try {
                    rendered = await this.encrytSendEmail(host, request);
                } catch(e) {
                    return this.abortError(response, e);
                }
            } else {
                let zroute_id = await this.getZRouteIdFromDomain(host);
                if (zroute_id === null || zroute_id === '' || typeof zroute_id === "undefined") return this.abort404(response, 'route file not specified for this domain'); // todo: replace with is_valid_id

                let routes = await this.ctx.client.storage.readJSON(zroute_id); // todo: check result
                if (!routes) return this.abort404(response, 'cannot parse json of zroute_id '+zroute_id);

                let template_id = routes[ parsedUrl.pathname ]; // todo: what if route doens't exist?
                if (!template_id) return this.abort404(response, 'route not found'); // todo: write a better msg
                let template_file_contents = await this.ctx.client.storage.readFile(template_id, 'utf-8');

                let renderer = new Renderer(ctx);
                let request_params = {};
                for(let k of parsedUrl.searchParams.entries()) request_params[ k[0] ] = k[1];
                // add session auth data to the reqest params for apps that need it
                let authData = request.session.get('_session_auth');
                request_params['_session_auth'] = authData == undefined ? {} : authData
                rendered = await renderer.render(template_file_contents, host, request_params); // todo: sanitize
            }

            let sanitized;
            if (contentType === 'text/html' && this.config.sanitize_html) {
                console.log('Sanitizing...' + contentType + this.config.sanitize_html + rendered);
                sanitized = this.sanitize(rendered);
            } else {
                // todo: potential security vulnerability here, e.g. if browser still thinks it's to be interpreted as html,
                // todo: and you didn't sanitize it, could get ugly. is contentType!=='text/html' check enough?
                sanitized = rendered;
            }

            if (typeof sanitized === 'undefined') sanitized = ''; // to avoid "response expected a string but got undefined"

            const headers = {
                'Content-Type': contentType
            };
            response.writeHead(200, headers);
            response.write(sanitized/*, 'utf-8'*/);
            response.end();

        } catch(e) {
            // throw 'ZProxy Error: '+e; // todo: remove
            return this.abortError(response, 'ZProxy Error: '+e);
        }

        // todo:?
        // console.log(request.headers.host);
        // console.log(request.port);
        // console.log(request.method);
        // console.log(request.url);
    }

    sanitize(html) {
        return sanitizeHtml(html, sanitizingConfig);
    }

    getContentTypeFromExt(ext) {
        // Note: just "css" won't work, so we prepend a dot
        return mime.lookup('.'+ext) || 'application/octet-stream';
    }

    keyValueAppend(host, request, response) {
        return new Promise(async(resolve, reject) => {
            let body = '';
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', async() => {
                if (request.method.toUpperCase() !== 'POST') return 'Error: Must be POST';

                let parsedUrl = new URL(request.url);
                let key = parsedUrl.pathname.split('/_keyvalue_append/')[1];
                let currentList = await this.ctx.keyvalue.list(host, key);
                let newIdx = currentList.length;
                let newKey = key + newIdx;

                let entries = new URL('http://localhost/?'+body).searchParams.entries();
                let postData = {};
                for(let entry of entries){
                    postData[ entry[0] ] = entry[1];
                }

                let redirect = request.headers.referer;
                for(let k in postData) {
                    let v = postData[k];
                    if (k === '__redirect') {
                        redirect = v;
                        delete postData[k];
                    } else if (_.startsWith(k, 'storage[')) {
                        // storage
                        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
                        this.ctx.utils.makeSurePathExists(cache_dir);
                        const tmpPostDataFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(v));
                        fs.writeFileSync(tmpPostDataFilePath, v);
                        let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
                        let uploaded_id = uploaded.id;

                        delete postData[k];
                        postData[k.replace('storage[', '').replace(']', '')] = uploaded_id;
                    }
                }

                postData.__from = this.ctx.config.client.wallet.account;
                postData.__time = Math.floor(Date.now() / 1000);
                let data = JSON.stringify(postData);

                await this.ctx.keyvalue.propagate(host, newKey, data);

                console.log('Redirecting to '+redirect+'...');
                const redirectHtml = '<html><head><meta http-equiv="refresh" content="0;url='+redirect+'" /></head></html>';  // todo: sanitize! don't trust it
                resolve(redirectHtml);
            });
            request.on('error', (e) => {
                reject('Error:', e);
            });
        });
    }

    auth(host, request, response) {
        return new Promise(async(resolve, reject) => {
            let body = '';
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', async() => {
                if (request.method.toUpperCase() !== 'POST') return 'Error: Must be POST';

                let entries = new URL('http://localhost/?'+body).searchParams.entries();
                let authData = {};
                for(let entry of entries){
                    authData[ entry[0] ] = entry[1];
                }

                // try to load the wallet using the id / passcode
                let wallet
                try{
                    wallet = await this.ctx.wallet.loadWalletFromKeystore(authData['walletid'], authData['passcode'])
                } catch(e) {
                    console.error(`Error loading wallet from keystore ${e}`)
                }

                if(wallet != undefined){
                    request.session.put('_session_auth', authData)
                    console.log(`Loaded Wallet with address: ${wallet.address}`)
                    console.log('Redirecting to site root (default behaviour for now)...');
                    const redirectHtml = '<html><head><meta http-equiv="refresh" content="0;url=/" /></head><body><b>Authentication Successful. Redirecting...</html>';
                    resolve(redirectHtml);
                } else {
                    reject('Unable to load wallet. Do try again!');
                }

            });
            request.on('error', (e) => {
                reject('Error:', e);
            });
        });
    }

    signOut(host, request, response) {
        return new Promise(async(resolve, reject) => {
            if (request.method.toUpperCase() !== 'POST') return 'Error: Must be POST';

            request.session.forget('_session_auth')
            const redirectHtml = '<html><head><meta http-equiv="refresh" content="0;url=/" /></head><body><b>Successfully Signed Out! Redirecting...</html>';
            resolve(redirectHtml);
            request.on('error', (e) => {
                reject('Error:', e);
            });
        });
    }

    encrytSendEmail(host, request, response) {
        return new Promise(async(resolve, reject) => {
            let body = '';
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', async() => {
                if (request.method.toUpperCase() !== 'POST') return 'Error: Must be POST';
                let entries = new URL('http://localhost/?'+body).searchParams.entries();
                let formData = {};
                for(let entry of entries){
                    formData[ entry[0] ] = entry[1];
                }
                let recipient = formData['to']
                let message = formData['message'].replace(' >>> ENCRYPTED!!','')
                let publicKey = formData['receipient_public_key'].substring(2)
                const { encryptedMessage, encryptedSymmetricKey} = await this.constructor.encryptPlainTextAndKey(host, message, publicKey)
                console.log('encryptedMessageout', encryptedMessage);
                console.log('encryptedSymmetricKeyout', encryptedSymmetricKey);

                //persist encrypted message to storage layer and obtain hash
                const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
                this.ctx.utils.makeSurePathExists(cache_dir);
                const tmpPostDataFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(encryptedMessage));
                fs.writeFileSync(tmpPostDataFilePath, encryptedMessage);
                let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
                let encryptedMessageHash = uploaded.id;
                console.log('encryptedMessageHash', encryptedMessageHash);

                const emailContractAddress = await this.ctx.web3bridge.getKeyValue('email', 'zweb/contracts/address/Email')
                const emailContractAbi = await this.get_from_ikv('email', 'zweb/contracts/abi/Email');
                const { abi } = JSON.parse(emailContractAbi)
                const emailContract = new this.web3.eth.Contract(abi, emailContractAddress)
                await emailContract.methods.send(recipient, encryptedMessageHash, encryptedSymmetricKey).call()
                const redirectHtml = '<html><head><meta http-equiv="refresh" content="0;url=/" /></head><body><b> Message Successfully Sent! Redirecting... </html>';
                resolve(redirectHtml);
            });
            request.on('error', (e) => {
                reject('Error:', e);
            });
        });
    }

    async get_from_ikv(identity, key) {
        const fileKey = await this.ctx.web3bridge.getKeyValue(identity, key);
        return await this.ctx.client.storage.readFile(fileKey, 'utf-8');
    }

    static async encryptPlainTextAndKey(host, plaintext, publicKey) {
        const symmetricKey = crypto.randomBytes(24)
        const iv = crypto.randomBytes(16)

        const cipher = crypto.createCipheriv('aes192', symmetricKey, iv)
        cipher.update(plaintext, 'utf-8')
        const encryptedMessage = cipher.final('hex')

        const publicKeyBuffer = Buffer.concat([
            Buffer.from('04', 'hex'),
            Buffer.from(publicKey.replace('0x', ''), 'hex')
        ])

        const hostNameHash = crypto.createHash('sha256');
        hostNameHash.update(host);
        const encryptedSymmetricObj = await eccrypto.encrypt(publicKeyBuffer, Buffer.from(`|${hostNameHash.digest('hex')}|${symmetricKey.toString('hex')}|`))
        const encryptedSymmetricKey = JSON.stringify(encryptedSymmetricObj)

        return {encryptedMessage, encryptedSymmetricKey}
    }

    contractSend(host, request, response) {
        return new Promise(async(resolve, reject) => {
            let body = '';
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', async() => {
                if (request.method.toUpperCase() !== 'POST') return 'Error: Must be POST';

                let parsedUrl = new URL(request.url);
                let contractAndMethod = parsedUrl.pathname.split('/_contract_send/')[1];
                let [contractName, methodNameAndParams] = contractAndMethod.split('.');
                let [methodName, paramsTogether] = methodNameAndParams.split('(');
                paramsTogether = paramsTogether.replace(')', '');
                let paramNames = paramsTogether.split(',');

                let entries = new URL('http://localhost/?'+body).searchParams.entries();
                let postData = {};
                for(let entry of entries){
                    postData[ entry[0] ] = entry[1];
                }

                let redirect = request.headers.referer;
                for(let k in postData) {
                    let v = postData[k];
                    if (k === '__redirect') {
                        redirect = v;
                        delete postData[k];
                    } else if (_.startsWith(k, 'storage[')) {
                        // storage
                        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
                        this.ctx.utils.makeSurePathExists(cache_dir);
                        const tmpPostDataFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(v));
                        fs.writeFileSync(tmpPostDataFilePath, v);
                        let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
                        let uploaded_id = uploaded.id;

                        delete postData[k];
                        postData[k.replace('storage[', '').replace(']', '')] = uploaded_id;
                    }
                }

                let params = [];
                for(let paramName of paramNames) {
                    params.push(postData[paramName]);
                }

                await this.ctx.web3bridge.sendContract(host, contractName, methodName, params);

                console.log('Redirecting to '+redirect+'...');
                const redirectHtml = '<html><head><meta http-equiv="refresh" content="0;url='+redirect+'" /></head></html>';
                resolve(redirectHtml); // todo: sanitize! don't trust it
            });
            request.on('error', (e) => {
                reject('Error:', e);
            });
        });
    }

    async getZRouteIdFromDomain(host) {
        const result = await this.ctx.web3bridge.getZRecord(host);
        console.log('getZRouteIdFromDomain result for '+host, result);
        return result;

        // const records = await this.getZDNSRecordsFromDomain(host);
        //
        // // todo: subdomains
        // for(let rec of records) {
        //     let [subdomain, type, value] = rec;
        //
        //     if (type === 'Z' && subdomain === '') return value;
        // }
        //
        // return null;
    }
}

module.exports = ZProxy;