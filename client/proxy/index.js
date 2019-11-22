const http = require('http');
const _ = require('lodash');
const fs = require('fs');
const Renderer = require('../zweb/renderer');
const path = require('path');
const sanitizeHtml = require('sanitize-html');
const sanitizingConfig = require('./sanitizing-config');
const mime = require('mime-types');

class ZProxy {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.zproxy;
        this.port = parseInt(this.config.port); // todo: put default if null/void
    }

    async start() {
        this.server = http.createServer(this.request.bind(this));
        this.server.listen(parseInt(this.port), '127.0.0.1'); // '127.0.0.1' = only listen to local requests
        this.ctx.log.info('ZProxy server listening on port '+parseInt(this.port)+' on localhost');
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
                parsedUrl = new URL(request.url);
            } catch(e) {
                parsedUrl = { pathname: '/error' }; // todo
            }

            console.debug(parsedUrl);
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
            } else {
                let zroute_id = await this.getZRouteIdFromDomain(host);
                if (zroute_id === null) return this.abort404(response, 'route file not found');

                let routes = await this.ctx.client.storage.readJSON(zroute_id); // todo: check result
                if (!routes) return this.abort404(response); // todo: should be a different error

                let template_id = routes[ parsedUrl.pathname ]; // todo: what if route doens't exist?
                if (!template_id) return this.abort404(response, 'route not found'); // todo: write a better msg
                let template_file_contents = await this.ctx.client.storage.readFile(template_id, 'utf-8');

                let renderer = new Renderer(ctx);
                let request_params = {};
                for(let k of parsedUrl.searchParams.entries()) request_params[ k[0] ] = k[1];
                rendered = await renderer.render(template_file_contents, host, request_params); // todo: sanitize
            }

            let sanitized;
            if (contentType === 'text/html') {
                sanitized = sanitizeHtml(rendered, sanitizingConfig);
            } else {
                // todo: potential security vulnerability here, e.g. if browser still thinks it's to be interpreted as html,
                // todo: and you didn't sanitize it, could get ugly
                sanitized = rendered;
            }

            const headers = {
                'Content-Type': contentType
            };
            response.writeHead(200, headers);
            response.write(sanitized/*, 'utf-8'*/);
            response.end();

        } catch(e) {
            throw e; // todo: remove
            return this.abortError(response, e);
        }

        // todo:?
        // console.log(request.headers.host);
        // console.log(request.port);
        // console.log(request.method);
        // console.log(request.url);
    }

    getContentTypeFromExt(ext) {
        return mime.lookup(ext) || 'application/octet-stream';
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
                    } else if (_.startsWith(k, '__')) {
                        // storage
                        const cache_dir = path.join(this.ctx.datadir, 'proxy_cache'); // todo: put into defaultConfig
                        this.ctx.utils.makeSurePathExists(cache_dir);
                        const tmpPostDataFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(v));
                        fs.writeFileSync(tmpPostDataFilePath, v);
                        let uploaded = await this.ctx.client.storage.putFile(tmpPostDataFilePath);
                        let uploaded_id = uploaded.id;

                        delete postData[k];
                        postData[k.substr(2)] = uploaded_id;
                    }
                }

                postData.__from = this.ctx.config.client.wallet.account;
                postData.__time = Math.floor(Date.now() / 1000);
                let data = JSON.stringify(postData);

                await this.ctx.keyvalue.propagate(host, newKey, data);

                console.log('Redirecting to '+redirect+'...');
                const redirectHtml = '<html><head><meta http-equiv="refresh" content="0;url='+redirect+'" /></head></html>';
                resolve(redirectHtml); // todo: sanitize! don't trust it
            });
            request.on('error', (e) => {
                reject(e);
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