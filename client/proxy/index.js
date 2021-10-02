const net = require('net');
const http = require('http');
const https = require('https');
const tls = require('tls');
const _ = require('lodash');
const fs = require('fs');
const Renderer = require('../zweb/renderer');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const mime = require('mime-types');
const sanitizingConfig = require('./sanitizing-config');
const WebSocketServer = require('websocket').server;
const ZProxySocketController = require('../../api/sockets/ZProxySocketController');
const url = require('url');
const certificates = require('./certificates');
const Directory = require('../../db/models/directory');
const qs = require('query-string');
const Console = require('../../console');
const utils = require('#utils');

class ZProxy {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.zproxy;
        this.port = parseInt(this.config.port); // todo: put default if null/void
        this.host = this.config.host;
        // for forwarding on api requests when required
        this.console = new Console(this.ctx);
    }

    async start() {
        let server = this.httpx();
        let ws = this.wsServer(server);
        server.listen(this.port, () => console.log(`ZProxy server listening on localhost:${ this.port }`));
    }

    wsServer(server) {
        try {
            const wss = new WebSocketServer({
                httpServer: server.https
            });

            wss.on('request', (request) => {
                let socket = request.accept(null, request.origin);
                let parsedUrl = new URL(request.origin);

                new ZProxySocketController(this.ctx, socket, wss, parsedUrl.host);

                socket.on('close', () => {
                    console.log('WS Client disconnected.');
                });

                socket.on('error', (e) => {
                    console.error('Error from WebSocket: ', e);
                    this.ctx.log.error(e);
                });
            });

            wss.on('error', (e) => {
                console.error('Error from WebSocketServer: ', e);
                this.ctx.log.error(e);
            });

            server.http.on('upgrade', (request, socket, head) => {
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request);
                });
            });

            return wss;
        } catch(e) {
            console.log('UNCAUGHT EXCEPTION IN ZPROXY:');
            console.log(e);
            throw e;
        }
    }

    httpx() {
        const credentials = {
            // A function that will be called if the client supports SNI TLS extension.
            SNICallback: (servername, cb) => {
                const certData = certificates.getCertificate(servername);
                const ctx = tls.createSecureContext(certData);

                if (!ctx) this.ctx.log.debug(`Not found SSL certificate for host: ${servername}`);
                else this.ctx.log.debug(`SSL certificate has been found and assigned to ${servername}`);

                if (cb) cb(null, ctx);
                else return ctx;
            },
        };

        this.doubleServer = net.createServer(socket => {
            socket.once('data', buffer => {
                // Pause the socket
                socket.pause();

                // Determine if this is an HTTP(s) request
                let byte = buffer[0];

                let protocol;
                if (byte === 22) {
                    protocol = 'https';
                } else if (32 < byte && byte < 127) {
                    protocol = 'http';
                } else {
                    console.error('Access Runtime Error! Protocol: not http, not https!');
                    protocol = 'error'; // todo: !
                }

                let proxy = this.doubleServer[protocol];
                if (proxy) {
                    // Push the buffer back onto the front of the data stream
                    socket.unshift(buffer);

                    // Emit the socket to the HTTP(s) server
                    proxy.emit('connection', socket);
                }

                // As of NodeJS 10.x the socket must be
                // resumed asynchronously or the socket
                // connection hangs, potentially crashing
                // the process. Prior to NodeJS 10.x
                // the socket may be resumed synchronously.
                process.nextTick(() => socket.resume());
            });
        });

        const redirectToHttpsHandler = function(request, response) {
            // Redirect to https
            const reqUrl = request.url;
            const httpsUrl = reqUrl.replace(/^(http:\/\/)/,"https://");
            response.writeHead(301, {'Location': httpsUrl});
            response.end();
        };
        this.doubleServer.http = http.createServer((this.config.redirect_to_https) ? redirectToHttpsHandler : this.request.bind(this));
        this.doubleServer.http.on('error', (err) => this.ctx.log.error(err));
        this.doubleServer.http.on('connect', (req, cltSocket, head) => {
            // connect to an origin server
            const srvUrl = url.parse(`https://${req.url}`);
            // const srvSocket = net.connect(srvUrl.port, srvUrl.hostname, () => {
            const srvSocket = net.connect(this.port, 'localhost', () => {
                cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node.js-Proxy\r\n' +
                    '\r\n');
                srvSocket.write(head);
                srvSocket.pipe(cltSocket);
                cltSocket.pipe(srvSocket);
            });
        });
        this.doubleServer.https = https.createServer(credentials, this.request.bind(this));
        this.doubleServer.https.on('error', (err) => this.ctx.log.error(err));
        return this.doubleServer;
    }

    abort404(response, message = 'domain not found') {
        const headers = {
            'Content-Type': 'text/html;charset=UTF-8',
        };
        response.writeHead(404, headers);
        response.write(this._errorMsgHtml(message, 404));
        response.end();
    }

    abortError(response, err) {
        const headers = {
            'Content-Type': 'text/html;charset=UTF-8',
        };
        response.writeHead(500, headers);
        response.write(this._errorMsgHtml(err, 500)); // better code
        this.ctx.log.error(`ZProxy 500 Error: ${err}`); // write out to ctx.log
        console.error(err); // for stack trace
        response.end();
    }

    async request(request, response) {
        let host = request.headers.host;
        if (! _.endsWith(host, '.z')) return this.abort404(response);

        try {
            let rendered;
            let parsedUrl;
            try {
                parsedUrl = new URL(request.url, `http://${request.headers.host}`);
            } catch(e) {
                parsedUrl = { pathname: '/error' }; // todo
            }

            let contentType = 'text/html';
            let status = 200;
            if (_.startsWith(parsedUrl.pathname, '/_storage/')) {
                let hash = parsedUrl.pathname.replace('/_storage/', '');
                let hashWithoutExt = (hash.split('.').length > 1) ? hash.split('.').slice(0, -1).join('.') : hash;
                let ext = hash.split('.').slice(-1)[0];

                let noExt = (ext === hashWithoutExt) || (hash.split('.').length === 1);
                if (noExt) contentType = 'text/plain'; // just in case
                if (!noExt) {
                    contentType = this.getContentTypeFromExt(ext);
                    if (contentType.includes('html')) contentType = 'text/html'; // just in case
                } // Note: after this block and call to getContentTypeFromExt, if there is no valid mime type detected, it will be application/octet-stream
                if (ext === 'zhtml') contentType = 'text/plain';

                try {
                    console.log('ASKING FOR '+hash);
                    rendered = await this.ctx.client.storage.readFile(hashWithoutExt);
                } catch(e) {
                    return this.abortError(response, e);
                }

                if (this._isThisDirectoryJson(rendered) && noExt) {
                    rendered = this._renderDirectory(hash, rendered);
                    contentType = 'text/html';
                }
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
            } else if (_.startsWith(parsedUrl.pathname, '/v1/api/')) {
                try {
                    let apiResponse = await this.apiResponseFor(parsedUrl.pathname, request);
                    status = apiResponse.status ? apiResponse.status : status;
                    contentType = 'application/json';
                    rendered = JSON.stringify(apiResponse);
                } catch(e) {
                    return this.abortError(response, e);
                }
            } else {
                try {
                    rendered = await this.processRequest(host, request, response, parsedUrl);
                    contentType = response._contentType;
                } catch(e) {
                    return this.abortError(response, e);
                }
            }

            let sanitized;
            if (contentType === 'text/html' && this.config.sanitize_html) {
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
            response.writeHead(status, headers);
            response.write(sanitized, {encoding: null}/*, 'utf-8'*/);
            response.end();

        } catch(e) {
            // throw 'ZProxy Error: '+e; // todo: remove
            console.log('ZProxy Error:', e); // todo: this one can be important for debugging, but maybe use ctx.log not console
            return this.abortError(response, 'ZProxy: '+e);
        }

        // todo:?
        // console.log(request.headers.host);
        // console.log(request.port);
        // console.log(request.method);
        // console.log(request.url);
    }

    _isThisDirectoryJson(text) {
        try {
            const obj = JSON.parse(text);
            if (obj.type && obj.type === 'dir') {
                return true;
            } else {
                return false;
            }
        } catch(e) {
            return false;
        }
    }

    _renderDirectory(id, text) {
        if (!this._isThisDirectoryJson(text)) throw Error('_renderDirectory: not a directory');

        const obj = JSON.parse(text);
        const files = obj.files;
        return this._directoryHtml(id, files);
    }

    async apiResponseFor(cmdstr, request) {
        cmdstr = cmdstr.replace('/v1/api/', '');
        cmdstr = cmdstr.replace(/\/$/, "");

        let [cmd, params] = this._parseApiCmd(cmdstr);
        let response = {};
        let body = '';
        let host = request.headers.host;
        if (request.method.toUpperCase() == 'POST') {
            let apiPromise = new Promise(async(resolve, reject) => {
                request.on('data', (chunk) => {
                    body += chunk;
                });
                request.on('end', async () => {
                    response = await this.console.cmd_api_post(host, cmd, body);
                    resolve(response);
                });
            });

            response = await apiPromise;
        } else {
            response = await this.console.cmd_api_get(host, cmd, ...params);
        }
        return response;
    }

    _parseApiCmd(cmdstr) {
        let [cmd, params] = cmdstr.split('?');
        params ? params = params.split('&') : params = '';
        return [cmd, params];
    }

    sanitize(html) {
        return sanitizeHtml(html, sanitizingConfig);
    }

    getContentTypeFromExt(ext) {
        // Note: just "css" won't work, so we prepend a dot
        if (ext === 'zhtml') {
            ext = 'html';
        }
        return mime.lookup('.'+ext) || 'application/octet-stream';
    }

    getExtFromFilename(filename) {
        var re = /(?:\.([^.]+))?$/;
        return re.exec(filename)[1];
    }

    processRequest(host, request, response, parsedUrl) {
        return new Promise(async(resolve, reject) => {
            let body = '';
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', async() => {
                try {
                    // First try route file (and check if this domain even exists)
                    let zroute_id = await this.getZRouteIdFromDomain(host);
                    if (zroute_id === null || zroute_id === '' || typeof zroute_id === "undefined") return this.abort404(response, 'Domain not found (Route file not specified for this domain)'); // todo: replace with is_valid_id

                    console.log('ASKING FOR zroute id for domain '+host+' - '+zroute_id);
                    let routes = await this.ctx.client.storage.readJSON(zroute_id); // todo: check result
                    if (!routes) return this.abort404(response, 'cannot parse json of zroute_id '+zroute_id);

                    // Download info about root dir
                    let rootDir = await this.getRootDirectoryForDomain(host);
                    rootDir.setCtx(this.ctx);
                    rootDir.setHost(host);

                    let route_params = {};
                    let template_filename = null;
                    const { match } = require('node-match-path');
                    for(const k in routes) {
                        const matched = match(k, parsedUrl.pathname);
                        if (matched.matches) {
                            route_params = matched.params;
                            template_filename = routes[ k ];
                            break;
                        }
                    }
                    if (template_filename) {
                        let template_file_id = await rootDir.getFileIdByPath(template_filename);
                        console.log('ASKING FOR getFileIdByPath '+template_filename+' - '+template_file_id);
                        let template_file_contents = await this.ctx.client.storage.readFile(template_file_id, 'utf-8');

                        let renderer = new Renderer(this.ctx, rootDir);
                        let request_params = {};
                        // GET
                        for (const k of parsedUrl.searchParams.entries()) request_params[k[0]] = k[1];
                        // POST takes priority, rewrites if needed
                        let bodyParsed = qs.parse(body);
                        for (const k in bodyParsed) request_params[k] = bodyParsed[k];

                        // Add params from route matching
                        request_params = Object.assign({}, request_params, route_params);

                        let rendered = await renderer.render(template_file_id, template_file_contents, host, request_params); // todo: sanitize

                        response._contentType = 'text/html';

                        resolve(rendered);
                    } else {
                        // If not, try root dir
                        // in parsedUrl.pathname will be something like "/index.css"

                        let rendered = await rootDir.readFileByPath(parsedUrl.pathname, null); // todo: encoding?

                        response._contentType = this.getContentTypeFromExt(this.getExtFromFilename(parsedUrl.pathname));
                        if (response._contentType.includes('html')) response._contentType = 'text/html'; // just in case

                        resolve(rendered);

                        // return this.abort404(response, 'route not found'); // todo: write a better msg // todo: remove, it's automatic
                    }
                } catch(e) {
                    reject(e); // todo: sanitize?
                }
            });
        });
    }


    keyValueAppend(host, request) {
        return new Promise(async(resolve, reject) => {
            let body = '';
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', async() => {
                if (request.method.toUpperCase() !== 'POST') return 'Error: Must be POST';

                let parsedUrl;
                try {
                    parsedUrl = new URL(request.url, `http://${request.headers.host}`);
                } catch(e) {
                    parsedUrl = { pathname: '/error' }; // todo
                }
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
                        utils.makeSurePathExists(cache_dir);
                        const tmpPostDataFilePath = path.join(cache_dir, utils.hashFnUtf8Hex(v)); // todo: are you sure it's utf8?
                        fs.writeFileSync(tmpPostDataFilePath, v);
                        let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
                        let uploaded_id = uploaded.id;
                        console.debug('Found storage[x], uploading file '+uploaded_id);

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

    contractSend(host, request) {
        return new Promise(async(resolve, reject) => {
            let body = '';
            request.on('data', (chunk) => {
                body += chunk;
            });
            request.on('end', async() => {
                console.log(490);

                if (request.method.toUpperCase() !== 'POST') return reject('Error: Must be POST');

                let parsedUrl;
                try {
                    parsedUrl = new URL(request.url, `http://${request.headers.host}`);
                } catch(e) {
                    parsedUrl = { pathname: '/error' }; // todo
                }
                let contractAndMethod = parsedUrl.pathname.split('/_contract_send/')[1];
                let [contractName, methodNameAndParams] = contractAndMethod.split('.');
                let [methodName, paramsTogether] = methodNameAndParams.split('(');
                paramsTogether = decodeURI(paramsTogether);
                paramsTogether = paramsTogether.replace(')', '');
                let paramNames = paramsTogether.split(',').map(e => e.trim()); // trim is so that we can do _contract_send/Blog.postArticle(title, contents)

                console.log(507);

                let entries = new URL('http://localhost/?'+body).searchParams.entries();
                let postData = {};
                for(let entry of entries){
                    postData[ entry[0] ] = entry[1];
                }

                console.log(515);

                let redirect = request.headers.referer;

                for(let k in postData) {
                    let v = postData[k];

                    console.log(522, k, v);

                    if (k === '__redirect') {
                        redirect = v;
                        delete postData[k];
                    } else if (_.startsWith(k, 'storage[')) {
                        // storage
                        console.log(529, k, v);

                        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
                        utils.makeSurePathExists(cache_dir);
                        console.log(533, k, v);
                        const tmpPostDataFilePath = path.join(cache_dir, utils.hashFnUtf8Hex(v)); // todo: are you sure it's utf8?
                        console.log(535, k, v);
                        fs.writeFileSync(tmpPostDataFilePath, v);
                        console.log(537, {k, v, tmpPostDataFilePath});
                        let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
                        let uploaded_id = uploaded.id;
                        console.log(540, {k, v, tmpPostDataFilePath, uploaded, uploaded_id});

                        delete postData[k];
                        postData[k.replace('storage[', '').replace(']', '')] = uploaded_id;
                        console.log(544);
                    }
                }

                console.log(538);

                let params = [];
                for(let paramName of paramNames) {
                    if (paramName in postData) {
                        params.push(postData[paramName]);
                    } else {
                        return reject('Error: no '+utils.escape(paramName)+' param in the data, but exists as an argument to the contract call.');
                    }
                }

                console.log(549);

                try {
                    await this.ctx.web3bridge.sendToContract(host, contractName, methodName, params);
                } catch(e) {
                    reject('Error: ' + e);
                }

                console.log(557);

                console.log('Redirecting to '+redirect+'...');
                const redirectHtml = '<html><head><meta http-equiv="refresh" content="0;url='+redirect+'" /></head></html>';
                resolve(redirectHtml); // todo: sanitize! don't trust it
            });
            request.on('error', (e) => {
                reject('Error: ' + e);
            });
        });
    }

    async getRootDirectoryForDomain(host) {
        const key = '::rootDir';
        const rootDirId = await this.ctx.web3bridge.getKeyValue(host, key);
        if (!rootDirId) throw Error('getRootDirectoryForDomain failed: key '+key+' returned empty: '+rootDirId);
        console.log('ASKING FOR getRootDirectoryForDomain '+host+' - '+rootDirId);
        const dirJsonString = await this.ctx.client.storage.readFile(rootDirId, 'utf-8');
        let directory = new Directory(); // todo: cache it, don't download/recreate each time?
        directory.unserialize(dirJsonString);
        directory.id = rootDirId;
        return directory;
    }

    async getZRouteIdFromDomain(host) {
        const result = await this.ctx.web3bridge.getZRecord(host);
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

    _directoryHtml(id, files) {
        let html = "<html><body style='background-color: #fafaff; padding: 20px;'>";
        html += "<style>th {text-align: left;}</style>";
        html += "<h1>Index of "+utils.escape(id)+"</h1>";
        html += "<hr><table style='width: 100%;'>";
        html += "<tr><th>File</th><th style='text-align: right;'>Size</th><th style='text-align: right;'>Hash</th></tr>";
        for(let f of files) {
            let icon = "";
            switch(f.type) {
                case 'fileptr':
                    icon += "&#128196; "; break; // https://www.compart.com/en/unicode/U+1F4C4
                case 'dirptr':
                    icon += "&#128193; "; break; // https://www.compart.com/en/unicode/U+1F4C1
                default:
                    icon += "&#10067; "; // https://www.compart.com/en/unicode/U+2753 - question mark
            }

            const name = f.name;
            const ext = utils.escape( name.split('.').slice(-1) );
            let link = '/_storage/' + f.id + ((f.type == 'fileptr') ? ('.'+ext) : '');

            html += "<tr><td>"+icon+" <a href='"+link+"' target='_blank'>";
            html += utils.escape(f.name);
            html += "</a></td>";

            html += "<td style='text-align: right;'>"+f.size+"</td>";
            html += "<td style='text-align: right;'><em>"+f.id+"</em></td>";

            html += "</tr>";
        }
        html += "</table></body></html>";
        return html;
    }

    _errorMsgHtml(message, code = 500) {
        let formattedMsg;
        if (typeof message==='string') {
            formattedMsg = utils.escape(message);
        } else if (message instanceof Error) {
            formattedMsg = utils.escape(message.name+": "+message.message)
                + "<br><br>"
                + "<div style='text-align: left; opacity: 70%; font-size: 80%;'>"
                + utils.nl2br(utils.escape(message.stack)) // todo: careful, stack might give some info about the username and folders etc. to the ajax app. maybe better remove it and only leave in dev mode
                + "</div>";
        } else {
            formattedMsg = JSON.stringify(message);
        }

        return "<html><body style='background-color: #222233;'>" +
            "<div style='text-align:center; margin-top: 20%;'>" +
            "<h1 style='font-size: 300px; color: #ccc; margin: 0; padding: 0;'>"+code+"</h1>" +
            "<div style='padding: 0 20%; color: #e8e8e8; margin-top: 10px; font-family: sans-serif;'><strong>Error: </strong>"+formattedMsg+
            "</div></div>" +
            "</body></html>";
    }
}

module.exports = ZProxy;