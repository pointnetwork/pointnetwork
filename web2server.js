const fastify = require('fastify');
const proxy = require('fastify-http-proxy');
const server = fastify({logger: true});

server.register(proxy, {
    upstream: 'https://localhost:8666',
    replyOptions: {
        rewriteRequestHeaders: (request, headers) => {
            const {rawHeaders} = request;
            const host = rawHeaders[rawHeaders.indexOf('Host') + 1];
            const [subdomain] = host.split('.');
            return {...headers, host: `${subdomain}.z`};
        },
        onError: (reply, error) => {
            try {
                if (JSON.parse(error).code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
                    reply.send('The site is only available in read mode. Please run Point Network to get full access to Web 3.0.');
                } else {
                    reply.send(error);
                }
            } catch (e) {
                console.error('Proxy error:', e);
                reply.send(error);
            }
        },
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
