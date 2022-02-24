const net = require('net');
const http = require('http');
const https = require('https');
const tls = require('tls');
const _ = require('lodash');
const fs = require('fs-extra');
const Renderer = require('../zweb/renderer');
const sanitizeHtml = require('sanitize-html');
const mime = require('mime-types');
const sanitizingConfig = require('./sanitizing-config');
const WebSocketServer = require('websocket').server;
const ZProxySocketController = require('../../api/sockets/ZProxySocketController');
const certificates = require('./certificates');
const LocalDirectory = require('../../db/models/local_directory');
const qs = require('query-string');
const Console = require('../../console');
const utils = require('../../core/utils');
const {HttpNotFoundError} = require('../../core/exceptions');
const {getFile, getJSON, uploadFile, getFileIdByPath, FILE_TYPE} = require('../storage/index');
const config = require('config');
const logger = require('../../core/log');
const log = logger.child({module: 'ZProxy'});
const detectContentType = require('detect-content-type');

class ZProxy {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = config.get('zproxy');
        this.port = parseInt(this.config.port); // todo: put default if null/void
        this.host = this.config.host;
        // for forwarding on api requests when required
        this.console = new Console(this.ctx);
    }

    async start() {
        const server = this.httpx();
        this.wsServer(server);
        server.listen(this.port, () =>
            log.info({host: this.host, port: this.port}, 'ZProxy server is started')
        );
    }

    wsServer(server) {
        try {
            const wss = new WebSocketServer({httpServer: server.https});

            wss.on('request', request => {
                const socket = request.accept(null, request.origin);
                const parsedUrl = new URL(request.origin);

                new ZProxySocketController(this.ctx, socket, wss, parsedUrl.host);

                socket.on('close', () => {
                    log.debug('WS Client disconnected');
                });

                socket.on('error', error => {
                    log.error(error, 'Error from WebSocket');
                });
            });

            wss.on('error', error => {
                log.error(error, 'Error from WebSocket');
            });

            server.http.on('upgrade', (request, socket, head) => {
                wss.handleUpgrade(request, socket, head, ws => {
                    wss.emit('connection', ws, request);
                });
            });

            return wss;
        } catch (error) {
            log.error(error, 'ZProxy.wsServer error');
            throw error;
        }
    }

    httpx() {
        const credentials = {
            // A function that will be called if the client supports SNI TLS extension.
            SNICallback: (servername, cb) => {
                const certData = certificates.getCertificate(servername);
                const ctx = tls.createSecureContext(certData);

                if (!ctx) {
                    log.debug({servername}, `Not found SSL certificate for host`);
                } else {
                    log.debug({servername}, `SSL certificate has been found and assigned`);
                }

                if (typeof cb !== 'function') {
                    return ctx;
                }

                cb(null, ctx);
            }
        };

        this.doubleServer = net.createServer(socket => {
            socket.once('data', buffer => {
                // Pause the socket
                socket.pause();

                // Determine if this is an HTTP(s) request
                const byte = buffer[0];

                let protocol;
                if (byte === 22) {
                    protocol = 'https';
                } else if (32 < byte && byte < 127) {
                    protocol = 'http';
                } else {
                    log.error({byte}, 'Access Runtime Error! Protocol: not http, not https!');
                    protocol = 'error'; // todo: !
                }

                const proxy = this.doubleServer[protocol];
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

        const redirectToHttpsHandler = function (request, response) {
            // Redirect to https
            const reqUrl = request.url;
            const httpsUrl = reqUrl.replace(/^(http:\/\/)/, 'https://');
            response.writeHead(301, {Location: httpsUrl});
            response.end();
        };
        this.doubleServer.http = http.createServer(
            this.config.redirect_to_https ? redirectToHttpsHandler : this.request.bind(this)
        );
        this.doubleServer.http.on('error', err => log.error(err, 'Double Server HTTP error'));
        this.doubleServer.http.on('connect', (req, cltSocket, head) => {
            // connect to an origin server
            const srvSocket = net.connect(this.port, 'localhost', () => {
                cltSocket.write(
                    'HTTP/1.1 200 Connection Established\r\n' +
                        'Proxy-agent: Node.js-Proxy\r\n' +
                        '\r\n'
                );
                srvSocket.write(head);
                srvSocket.pipe(cltSocket);
                cltSocket.pipe(srvSocket);
            });
        });
        this.doubleServer.https = https.createServer(credentials, this.request.bind(this));
        this.doubleServer.https.on('error', err =>
            log.error(err, 'Double Server HTTPS error')
        );
        return this.doubleServer;
    }

    abort404(response, message = 'domain not found') {
        const headers = {'Content-Type': 'text/html;charset=UTF-8'};
        response.writeHead(404, headers);
        response.write(this._errorMsgHtml(message, 404));
        response.end();
    }

    abortError(response, err) {
        const headers = {'Content-Type': 'text/html;charset=UTF-8'};
        response.writeHead(500, headers);
        response.write(this._errorMsgHtml(err, 500)); // better code
        log.error({err, stack: err.stack}, `ZProxy 500 Error`);
        response.end();
    }

    async request(request, response) {
        const host = request.headers.host;
        if (host !== 'point' && !_.endsWith(host, '.z')) return this.abort404(response);
        try {
            let rendered;
            let parsedUrl;
            try {
                parsedUrl = new URL(request.url, `http://${request.headers.host}`);
            } catch (e) {
                parsedUrl = {pathname: '/error'}; // todo
            }

            let contentType = 'text/html';
            let status = 200;
            if (_.startsWith(parsedUrl.pathname, '/_storage/')) {
                if (request.method.toUpperCase() === 'POST') {
                    // user is posting content to storage layer
                    try {
                        const response = await this.storagePostFile(request);
                        status = response.status ? response.status : status;
                        contentType = 'application/json';
                        rendered = JSON.stringify(response);
                    } catch (e) {
                        return this.abortError(response, e);
                    }
                } else {
                    const hash = parsedUrl.pathname.replace('/_storage/', '');
                    const hashWithoutExt =
                        hash.split('.').length > 1 ? hash.split('.').slice(0, -1).join('.') : hash;
                    const ext = hash.split('.').slice(-1)[0];

                    try {
                        log.debug({hash}, 'Reading file from storage');
                        rendered = await getFile(hashWithoutExt, null);
                    } catch (e) {
                        return this.abortError(response, e);
                    }
                    
                    const noExt = ext === hashWithoutExt || hash.split('.').length === 1;
                    if (noExt) contentType = detectContentType(rendered); // just in case
                    if (!noExt) {
                        contentType = this.getContentTypeFromExt(ext);
                        if (contentType.includes('html')) contentType = 'text/html'; // just in case
                    } // Note: after this block and call to getContentTypeFromExt, if there is no valid mime type detected, it will be application/octet-stream
                    if (ext === 'zhtml') contentType = 'text/plain';


                    if (this._isThisDirectoryJson(rendered) && noExt) {
                        rendered = this._renderDirectory(hash, rendered);
                        contentType = 'text/html';
                    }
                }
            } else if (_.startsWith(parsedUrl.pathname, '/_keyvalue_append/')) {
                try {
                    rendered = await this.keyValueAppend(host, request);
                } catch (e) {
                    return this.abortError(response, e);
                }
            } else if (_.startsWith(parsedUrl.pathname, '/_contract_send/')) {
                try {
                    rendered = await this.contractSend(host, request);
                } catch (e) {
                    return this.abortError(response, e);
                }
            } else if (_.startsWith(parsedUrl.pathname, '/v1/api/')) {
                try {
                    const apiResponse = await this.apiResponseFor(parsedUrl.pathname, request);
                    status = apiResponse.status ? apiResponse.status : status;
                    contentType = 'application/json';
                    rendered = JSON.stringify(apiResponse);
                } catch (e) {
                    return this.abortError(response, e);
                }
            } else if (host === 'point') {
                // handle the point welcome page by rendering explorer.z
                const localPath = 'internal/explorer.z/public'; // hardcode to render explorer.z
                rendered = await this.processLocalRequest(
                    host,
                    localPath,
                    request,
                    response,
                    parsedUrl
                );
                contentType = response._contentType;
            } else if (false /*for testing only*/ && config.get('mode') === 'zappdev') {
                // when MODE=zappdev is set this site will be loaded directly from the local system - useful for Zapp developers :)

                // First try route file (and check if this domain even exists)
                const zroute_id = await this.getZRouteIdFromDomain(host);
                if (
                    zroute_id === null ||
                    zroute_id === '' ||
                    typeof zroute_id === 'undefined'
                ) {
                    return this.abort404(
                        response,
                        'Domain not found (Route file not specified for this domain) - Is the ZApp deployed?'
                    ); // todo: replace with is_valid_id
                }

                // If host contains `dev`, then we slice the zapp name out of the host to serve from local example folder
                const zappName = host.includes('dev') ? `${host.split('dev')[0]}.z` : host;
                const localPath = `example/${zappName}/public`; // hardcode to render the zapp host
                rendered = await this.processLocalRequest(
                    host,
                    localPath,
                    request,
                    response,
                    parsedUrl
                );
                contentType = response._contentType;
            } else {
                try {
                    rendered = await this.processRequest(host, request, response, parsedUrl);
                    contentType = response._contentType;
                } catch (e) {
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

            const headers = {'Content-Type': contentType};
            response.writeHead(status, headers);
            response.write(sanitized, {encoding: null});
            response.end();
        } catch (error) {
            // throw 'ZProxy Error: '+e; // todo: remove
            log.error(
                {host, error: error.message, stack: error.stack},
                'ZProxy.request Error'
            );

            if (error instanceof HttpNotFoundError) {
                return this.abort404(response, error.message);
            } else {
                return this.abortError(response, 'ZProxy: ' + error);
            }
        }

        // todo:?
    }

    _isThisDirectoryJson(text) {
        try {
            const obj = JSON.parse(text);
            if (obj.type && obj.type === 'dir') {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    _renderDirectory(id, text) {
        if (!this._isThisDirectoryJson(text)) throw Error('_renderDirectory: not a directory');

        const obj = JSON.parse(text);
        const files = obj.files;
        return this._directoryHtml(id, files);
    }

    async storagePostFile(request) {
        if (request.headers['content-type'].startsWith('multipart/form-data')) {
            // If the request a multipart/form-data type then parse the file upload using formidable
            const formidable = require('formidable');
            const form = formidable({multiples: true});

            return new Promise((resolve, reject) => {
                form.parse(request, async (err, fields, files) => {
                    try {
                        for (const key in files) {
                            // TODO: properly handle multiple file uploads
                            const uploadedFilePath = files[key].path;
                            const fileData = fs.readFileSync(uploadedFilePath);
                            const uploadedId = await uploadFile(fileData);

                            const response = {status: 200, data: uploadedId};
                            resolve(response);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        } // TODO what if its not a multipart/form-data request?
    }

    async apiResponseFor(cmdstr, request) {
        cmdstr = cmdstr.replace('/v1/api/', '');
        cmdstr = cmdstr.replace(/\/$/, '');

        const [cmd, params] = this._parseApiCmd(cmdstr);
        let response = {};
        let body = '';
        const host = request.headers.host;

        if (request.method.toUpperCase() === 'POST') {
            const apiPromise = new Promise((resolve, reject) => {
                try {
                    request.on('data', chunk => {
                        body += chunk;
                    });
                    request.on('end', async () => {
                        response = await this.console.cmd_api_post(host, cmd, body);
                        resolve(response);
                    });
                } catch (e) {
                    reject(e);
                }
            });

            response = await apiPromise;
        } else {
            response = await this.console.cmd_api_get(host, cmd, ...params);
        }
        return response;
    }

    _parseApiCmd(cmdstr) {
        let [cmd, params] = cmdstr.split('?');
        if (params) {
            params = params.split('&');
        } else {
            params = '';
        }
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
        return mime.lookup('.' + ext) || 'application/octet-stream';
    }

    getExtFromFilename(filename) {
        var re = /(?:\.([^.]+))?$/;
        return re.exec(filename)[1];
    }

    processLocalRequest(host, filePath, request, response, parsedUrl) {
        return new Promise((resolve, reject) => {
            let body = '';
            request.on('data', chunk => {
                body += chunk;
            });
            request.on('end', async () => {
                try {
                    const routesJsonPath = `${filePath}/../routes.json`;
                    const routes = fs.readJSONSync(routesJsonPath);

                    let route_params = {};
                    let template_filename = null;
                    const {match} = require('node-match-path');
                    for (const k in routes) {
                        const matched = match(k, parsedUrl.pathname);
                        if (matched.matches) {
                            route_params = matched.params;
                            template_filename = routes[k];
                            break;
                        }
                    }

                    if (template_filename) {
                        // Use a LocalDirectory object since we are rendering locally
                        const directory = new LocalDirectory(this.ctx);
                        directory.setLocalRoot(filePath);

                        // const template_file_path = `${filePath}/${template_filename}`;
                        const template_file_contents = await directory.readFileByPath(
                            `${template_filename}`,
                            'utf-8'
                        );

                        const renderer = new Renderer(this.ctx, {localDir: directory});
                        let request_params = {};

                        // Add params from route matching
                        request_params = Object.assign({}, request_params, route_params);

                        // GET
                        for (const k of parsedUrl.searchParams.entries())
                            request_params[k[0]] = k[1];
                        // POST takes priority, rewrites if needed
                        const bodyParsed = qs.parse(body);
                        for (const k in bodyParsed) request_params[k] = bodyParsed[k];

                        // // Add params from route matching
                        request_params = Object.assign({}, request_params, route_params);

                        const rendered = await renderer.render(
                            template_filename,
                            template_file_contents,
                            host,
                            request_params
                        ); // todo: sanitize

                        response._contentType = 'text/html';

                        resolve(rendered);
                    } else {
                        // If not, try root dir
                        // in parsedUrl.pathname will be something like "/index.css"

                        // Use a LocalDirectory object since we are rendering locally
                        const directory = new LocalDirectory(this.ctx);
                        directory.setLocalRoot(filePath);

                        const rendered = await directory.readFileByPath(parsedUrl.pathname, null); // todo: encoding?

                        response._contentType = this.getContentTypeFromExt(
                            this.getExtFromFilename(parsedUrl.pathname)
                        );
                        if (response._contentType.includes('html'))
                            response._contentType = 'text/html'; // just in case

                        resolve(rendered);
                    }
                } catch (e) {
                    reject(e); // todo: sanitize?
                }
            });
        });
    }

    processRequest(host, request, response, parsedUrl) {
        return new Promise((resolve, reject) => {
            let body = '';
            request.on('data', chunk => {
                body += chunk;
            });
            request.on('end', async () => {
                try {
                    let version = 'latest';
                    console.log(parsedUrl);


                    if(parsedUrl.searchParams != undefined && 
                        parsedUrl.searchParams.has('__point_version')){
                        version = parsedUrl.searchParams.get('__point_version');
                        
                    }
                    console.log('--------------');
                    console.log('version = ' + version);
                    console.log('--------------');

                    // First try route file (and check if this domain even exists)
                    const zroute_id = await this.getZRouteIdFromDomain(host, version);
                    console.log('--------------');
                    console.log('zroute_id = ' + zroute_id);
                    console.log('--------------');
                    if (
                        zroute_id === null ||
                        zroute_id === '' ||
                        typeof zroute_id === 'undefined'
                    ) {
                        return this.abort404(
                            response,
                            'Domain not found (Route file not specified for this domain)'
                        ); // todo: replace with is_valid_id
                    }

                    log.debug({host, zroute_id}, 'Requesting ZRoute id for domain');
                    const routes = await getJSON(zroute_id); // todo: check result
                    if (!routes)
                        return this.abort404(
                            response,
                            'cannot parse json of zroute_id ' + zroute_id
                        );

                    // Download info about root dir
                    const rootDirId = await this.getRootDirectoryIdForDomain(host, version);
                    console.log('--------------');
                    console.log('rootDirId = ' + rootDirId);
                    console.log('--------------');

                    let route_params = {};
                    let template_filename = null;
                    const {match} = require('node-match-path');
                    for (const k in routes) {
                        const matched = match(k, parsedUrl.pathname);
                        if (matched.matches) {
                            route_params = matched.params;
                            template_filename = routes[k];
                            break;
                        }
                    }
                    if (template_filename) {
                        const template_file_id = await getFileIdByPath(
                            rootDirId,
                            template_filename
                        );
                        log.debug(
                            {template_filename, template_file_id},
                            'ZProxy.processRequest getFileIdByPath result'
                        );
                        const template_file_contents = await getFile(template_file_id);

                        const renderer = new Renderer(this.ctx, {rootDirId});
                        let request_params = {};
                        // GET
                        for (const k of parsedUrl.searchParams.entries())
                            request_params[k[0]] = k[1];
                        // POST takes priority, rewrites if needed
                        const bodyParsed = qs.parse(body);
                        for (const k in bodyParsed) request_params[k] = bodyParsed[k];

                        // Add params from route matching
                        request_params = Object.assign({}, request_params, route_params);

                        const rendered = await renderer.render(
                            template_file_id,
                            template_file_contents,
                            host,
                            request_params
                        ); // todo: sanitize

                        response._contentType = 'text/html';

                        resolve(rendered);
                    } else {
                        // If not, try root dir
                        // in parsedUrl.pathname will be something like "/index.css"

                        // This condition is when a user of a SPA hits refresh and the url is part of the SPA
                        // managed routes and not part of ZProxy managed routes. In this case, simple solution is
                        // to redirect the user back to the site home page.
                        if (request.headers.referer === undefined) {
                            const redirect = '/';
                            log.debug(
                                {redirect},
                                'Page reload detected from unknown referer. Redirecting to'
                            );
                            response._contentType = 'text/html';
                            const redirectHtml =
                                '<html><head><meta http-equiv="refresh" content="0;url=' +
                                redirect +
                                '" /></head></html>';
                            resolve(redirectHtml);
                        }

                        const renderedId = await getFileIdByPath(rootDirId, parsedUrl.pathname);
                        const rendered = await getFile(renderedId, null);

                        response._contentType = this.getContentTypeFromExt(
                            this.getExtFromFilename(parsedUrl.pathname)
                        );
                        if (response._contentType.includes('html'))
                            response._contentType = 'text/html'; // just in case

                        resolve(rendered);

                        // return this.abort404(response, 'route not found'); // todo: write a better msg // todo: remove, it's automatic
                    }
                } catch (e) {
                    reject(e); // todo: sanitize?
                }
            });
        });
    }

    keyValueAppend(host, request) {
        return new Promise((resolve, reject) => {
            let body = '';
            request.on('data', chunk => {
                body += chunk;
            });
            request.on('end', async () => {
                try {
                    if (request.method.toUpperCase() !== 'POST') return 'Error: Must be POST';

                    let parsedUrl;
                    try {
                        parsedUrl = new URL(request.url, `http://${request.headers.host}`);
                    } catch (e) {
                        parsedUrl = {pathname: '/error'}; // todo
                    }
                    const key = parsedUrl.pathname.split('/_keyvalue_append/')[1];
                    const currentList = await this.ctx.keyvalue.list(host, key);
                    const newIdx = currentList.length;
                    const newKey = key + newIdx;

                    const entries = new URL('http://localhost/?' + body).searchParams.entries();
                    const postData = {};
                    for (const entry of entries) {
                        postData[entry[0]] = entry[1];
                    }

                    let redirect = request.headers.referer;
                    for (const k in postData) {
                        const v = postData[k];
                        if (k === '__redirect') {
                            redirect = v;
                            delete postData[k];
                        } else if (_.startsWith(k, 'storage[')) {
                            const uploadedId = await uploadFile(v);
                            log.debug({uploaded_id}, 'Found storage[x], uploading file');

                            delete postData[k];
                            postData[k.replace('storage[', '').replace(']', '')] = uploadedId;
                        }
                    }

                    postData.__from = this.ctx.wallet.getNetworkAccount();
                    postData.__time = Math.floor(Date.now() / 1000);
                    const data = JSON.stringify(postData);

                    await this.ctx.keyvalue.propagate(host, newKey, data);

                    log.debug({host, redirect}, 'Redirecting after keyValueAppend');
                    const redirectHtml =
                        '<html><head><meta http-equiv="refresh" content="0;url=' +
                        redirect +
                        '" /></head></html>'; // todo: sanitize! don't trust it
                    resolve(redirectHtml);
                } catch (e) {
                    reject(e);
                }
            });
            request.on('error', e => {
                reject(e);
            });
        });
    }

    contractSend(host, request) {
        return new Promise((resolve, reject) => {
            let body = '';
            request.on('data', chunk => {
                body += chunk;
            });
            request.on('end', async () => {
                try {
                    if (request.method.toUpperCase() !== 'POST') reject(new Error('Must be POST'));

                    let parsedUrl;
                    try {
                        parsedUrl = new URL(request.url, `http://${request.headers.host}`);
                    } catch (e) {
                        parsedUrl = {pathname: '/error'}; // todo
                    }
                    const contractAndMethod = parsedUrl.pathname.split('/_contract_send/')[1];
                    const [contractName, methodNameAndParams] = contractAndMethod.split('.');
                    let [methodName, paramsTogether] = methodNameAndParams.split('(');
                    paramsTogether = decodeURI(paramsTogether);
                    paramsTogether = paramsTogether.replace(')', '');
                    const paramNames = paramsTogether.split(',').map(e => e.trim()); // trim is so that we can do _contract_send/Blog.postArticle(title, contents)

                    const entries = new URL('http://localhost/?' + body).searchParams.entries();
                    const postData = {};
                    for (const entry of entries) {
                        postData[entry[0]] = entry[1];
                    }

                    let redirect = request.headers.referer;

                    for (const k in postData) {
                        const v = postData[k];
                        if (k === '__redirect') {
                            redirect = v;
                            delete postData[k];
                        } else if (_.startsWith(k, 'storage[')) {
                            const uploaded_id = await uploadFile(v);

                            delete postData[k];
                            postData[k.replace('storage[', '').replace(']', '')] = uploaded_id;
                        }
                    }

                    const params = [];
                    for (const paramName of paramNames) {
                        if (paramName in postData) {
                            params.push(postData[paramName]);
                        } else {
                            reject(new Error(
                                'Error: no ' +
                                utils.escape(paramName) +
                                ' param in the data, but exists as an argument to the contract call.'
                            ));
                        }
                    }

                    try {
                        await this.ctx.web3bridge.sendToContract(
                            host,
                            contractName,
                            methodName,
                            params
                        );
                    } catch (e) {
                        reject(e);
                    }

                    log.debug({host, redirect}, 'Redirecting after contractSend');

                    const redirectHtml =
                        '<html><head><meta http-equiv="refresh" content="0;url=' +
                        redirect +
                        '" /></head></html>';
                    resolve(redirectHtml); // todo: sanitize! don't trust it
                } catch (e) {
                    reject(e);
                }
            });
            request.on('error', e => {
                reject(e);
            });
        });
    }

    async getRootDirectoryIdForDomain(host, version = 'latest') {
        const key = '::rootDir';
        const rootDirId = await this.ctx.web3bridge.getKeyValue(host, key, version);
        if (!rootDirId)
            throw Error(
                'getRootDirectoryIdForDomain failed: key ' + key + ' returned empty: ' + rootDirId
            );
        return rootDirId;
    }

    async getZRouteIdFromDomain(host, version = 'latest') {
        const result = await this.ctx.web3bridge.getZRecord(host, version);
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
        let html = '<html><body style=\'background-color: #fafaff; padding: 20px;\'>';
        html += '<style>th {text-align: left;}</style>';
        html += '<h1>Index of ' + utils.escape(id) + '</h1>';
        html += '<hr><table style=\'width: 100%;\'>';
        html +=
            '<tr><th>File</th><th style=\'text-align: right;\'>Size</th><th style=\'text-align: right;\'>Hash</th></tr>';
        for (const f of files) {
            let icon = '';
            switch (f.type) {
                case FILE_TYPE.fileptr:
                    icon += '&#128196; ';
                    break; // https://www.compart.com/en/unicode/U+1F4C4
                case FILE_TYPE.dirptr:
                    icon += '&#128193; ';
                    break; // https://www.compart.com/en/unicode/U+1F4C1
                default:
                    icon += '&#10067; '; // https://www.compart.com/en/unicode/U+2753 - question mark
            }

            const name = f.name;
            const ext = utils.escape(name.split('.').slice(-1));
            const link = '/_storage/' + f.id + (f.type === FILE_TYPE.fileptr ? '.' + ext : '');

            html += '<tr><td>' + icon + ' <a href=\'' + link + '\' target=\'_blank\'>';
            html += utils.escape(f.name);
            html += '</a></td>';

            html += '<td style=\'text-align: right;\'>' + f.size + '</td>';
            html += '<td style=\'text-align: right;\'><em>' + f.id + '</em></td>';

            html += '</tr>';
        }
        html += '</table></body></html>';
        return html;
    }

    _errorMsgHtml(message, code = 500) {
        let formattedMsg;
        if (typeof message === 'string') {
            formattedMsg = utils.escape(message);
        } else if (message instanceof Error) {
            formattedMsg =
                utils.escape(message.name + ': ' + message.message) +
                '<br><br>' +
                '<div style=\'text-align: left; opacity: 70%; font-size: 80%;\'>' +
                utils.nl2br(utils.escape(message.stack)) + // todo: careful, stack might give some info about the username and folders etc. to the ajax app. maybe better remove it and only leave in dev mode
                '</div>';
        } else {
            formattedMsg = JSON.stringify(message);
        }

        return (
            '<html><body style=\'background-color: #222233;\'>' +
            '<div style=\'text-align:center; margin-top: 20%;\'>' +
            '<h1 style=\'font-size: 300px; color: #ccc; margin: 0; padding: 0;\'>' +
            code +
            '</h1>' +
            '<div style=\'padding: 0 20%; color: #e8e8e8; margin-top: 10px; font-family: sans-serif;\'><strong>Error: </strong>' +
            formattedMsg +
            '</div></div>' +
            '</body></html>'
        );
    }
}

module.exports = ZProxy;
