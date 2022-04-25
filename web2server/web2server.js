const cheerio = require('cheerio');
const fastify = require('fastify');
const proxy = require('fastify-http-proxy');
const pointSdk = require('./pointSdk');
const removeMetamask = require('./removeMetamask');

const server = fastify({logger: true});
const POINT_NODE_URL = 'https://localhost:8666';

const scripts = [pointSdk, removeMetamask];

server.register(proxy, {
    upstream: POINT_NODE_URL,
    replyOptions: {
        rewriteRequestHeaders: (request, headers) => {
            const {rawHeaders} = request;
            const host = rawHeaders[rawHeaders.indexOf('Host') + 1];
            const [subdomain] = host.split('.');
            return {...headers, host: `${subdomain}.point`};
        },
        onError: (reply, error) => {
            try {
                if (JSON.parse(error).code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
                    reply.send(
                        'The site is only available in read mode. Please run Point Network to get full access to Web 3.0.'
                    );
                } else {
                    reply.send(error);
                }
            } catch (e) {
                console.error('Proxy error:', e);
                reply.send(error);
            }
        },
        onResponse: (request, reply, stream) => {
            const contentType = reply.getHeader('content-type');
            if (contentType !== 'text/html') {
                return reply.send(stream);
            }
            const chunks = [];
            stream.on('data', (chunk) => {
                chunks.push(chunk);
            });
            stream.on('end', async () => {
                const buffer = Buffer.concat(chunks);
                try {
                    const decompressed = buffer;
                    const htmlContent = await cheerio.load(decompressed.toString());
                    scripts.forEach((script) => {
                        htmlContent('body').append(`<script>${script}</script>`);
                    });
                    const bufferWithScripts = htmlContent.html();
                    reply.send(bufferWithScripts);
                } catch (e) {
                    reply.send(buffer);
                }
            });
        }
    },
    httpMethods: ['GET']
});

server.listen(5000, (err, address) => {
    if (err) {
        console.error(err);
    } else {
        console.info({address}, 'Success');
    }
});
