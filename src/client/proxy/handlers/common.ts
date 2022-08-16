/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import {promises as fs, existsSync, lstatSync} from 'fs';
import {parse} from 'query-string';
import axios from 'axios';
import {readFileByPath} from '../../../util';
import {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import ZProxySocketController from '../../../api/sockets/ZProxySocketController';
import {SocketStream} from 'fastify-websocket';
import Renderer from '../../zweb/renderer';
import logger from '../../../core/log';
import blockchain from '../../../network/providers/ethereum';
import {getContentTypeFromExt, getParamsAndTemplate} from '../proxyUtils';
// @ts-expect-error no types for package
import {detectContentType} from 'detect-content-type';
import config from 'config';
import {Template, templateManager} from '../templateManager';
import {getMirrorWeb2Page} from './mirror';
import {parseDomainRegistry} from '../../../name_service/registry';
import csrfTokens from '../../zweb/renderer/csrfTokens';
import {randomBytes} from 'crypto';
const {getJSON, getFileIdByPath, getFile} = require('../../storage');
const sanitizeUrl = require('@braintree/sanitize-url').sanitizeUrl;

const log = logger.child({module: 'ZProxy'});

const API_URL = `http://${config.get('api.address')}:${config.get('api.port')}`;

const getHttpRequestHandler = () => async (req: FastifyRequest, res: FastifyReply) => {
    try {
        const host = req.headers.host!;
        const urlData = req.urlData();
        const queryParams = parse(urlData.query ?? '');
        let urlPath = urlData.path!;
        const fileName = urlPath.split('/')[urlPath.split('/').length - 1];
        const ext =
            fileName.split('.').length > 1
                ? fileName.split('.')[fileName.split('.').length - 1]
                : null;

        if (host === 'point') {
            if (req.url.startsWith('/web2redirect')) {
                res.header('Content-Type', 'text/html');
                let refererHost = req.headers.referer || '';
                const matches = refererHost.match(/^https:\/\/(.*)\//);
                if (matches) {
                    refererHost = matches[1];
                }
                if (!csrfTokens.point) {
                    csrfTokens.point = randomBytes(64).toString('hex');
                }
                return templateManager.render(Template.WEB2LINK, {
                    url: queryParams?.url,
                    csrfToken: csrfTokens.point,
                    host: refererHost
                });
            }

            // Process internal point webpage
            const publicPath = path.resolve(
                __dirname,
                '../../../../internal/explorer.point/public'
            );
            // Now point explorer is SPA, so we should either return static asset, or index.zhtml
            // First, check if it's a static file
            const filePath = path.join(publicPath, fileName);
            if (urlPath !== '/' && existsSync(filePath)) {
                const file = await fs.readFile(filePath);
                const contentType = ext ? getContentTypeFromExt(ext) : detectContentType(file);

                res.header('Content-Type', contentType);
                return file;
            } else {
                // If not, render index.zhtml
                const file = await fs.readFile(path.join(publicPath, 'index.zhtml'), 'utf8');
                const renderer = new Renderer({localDir: publicPath} as any);

                res.header('Content-Type', 'text/html');
                // TODO: sanitize
                return renderer.render('index.zhtml', file, host, {});
            }
        } else if (host.endsWith('.z')) {
            res.header('Location', 'https://' + host.replace(/\.z/, '.point'));
            return res.status(301).send();
        } else if (host.endsWith('.local') || (config.get('mode') === 'zappdev' && host.endsWith('.point'))) {
            // when MODE=zappdev is set this site will be loaded directly from the local system - useful for Zapp developers :)
            // Side effect: versionig of zapps will not work for Zapp files in this env since files are loaded from local file system.
            const version = (queryParams.__point_version as string) ?? 'latest';

            // First try route file (and check if this domain even exists)
            const zrouteId = await blockchain.getZRecord(host, version);

            if (!zrouteId && !host.endsWith('.local')) {
                return res.status(404).send('Domain not found (Route file not specified for this domain)');
            }

            const zappName = host.endsWith('dev') ? `${host.split('dev')[0]}.point` : host;

            const zappsDir: string = config.get('zappsdir');
            let zappDir: string;
            if (zappsDir) {
                if (zappsDir.startsWith('/') || zappsDir.startsWith('~')) {
                    zappDir = path.resolve(zappsDir, zappName);
                } else {
                    zappDir = path.resolve(__dirname, `../../../../${zappsDir}/${zappName}`);
                }
            } else {
                zappDir = path.resolve(__dirname, `../../../../example/${zappName}`);
            }

            const deployJsonPath = path.resolve(zappDir, 'point.deploy.json');
            const deployConfig = JSON.parse(await fs.readFile(deployJsonPath, 'utf8'));
            let rootDir = 'public';
            if (deployConfig.hasOwnProperty('rootDir') && deployConfig.rootDir !== '') {
                rootDir = deployConfig.rootDir;
            }

            const publicPath = path.resolve(zappDir, rootDir);
            if (!existsSync(publicPath)) {
                throw new Error('Public path ' + publicPath + ' doesnt exist.');
            }

            const routesJsonPath = path.resolve(zappDir, 'routes.json');
            if (!existsSync(routesJsonPath)) {
                throw new Error('Routes file ' + routesJsonPath + ' doesnt exist.');
            }

            const routes = JSON.parse(await fs.readFile(routesJsonPath, 'utf8'));

            const {routeParams, templateFilename, rewritedPath} = getParamsAndTemplate(
                routes,
                urlPath
            );

            if (rewritedPath) {
                urlPath = rewritedPath;
            }

            if (templateFilename) {
                // This is a ZHTML file
                const templateFileContents = await readFileByPath(
                    publicPath,
                    `${templateFilename}`,
                    'utf-8'
                );

                const renderer = new Renderer({localDir: publicPath} as any);

                const contentType = ext ? getContentTypeFromExt(ext) : 'text/html';
                res.header('Content-Type', contentType);

                // TODO: sanitize
                return await renderer.render(templateFilename, templateFileContents, host, {
                    ...routeParams,
                    ...queryParams,
                    ...((req.body as Record<string, unknown>) ?? {})
                });
            } else {
                // This is a static asset
                const filePath = path.join(publicPath, urlPath);
                if (! existsSync(filePath)) {
                    return res.status(404).send('Not Found');
                }
                if (! lstatSync(filePath).isFile()) {
                    return res.status(403).send('Directory listing not allowed');
                }

                const file = await fs.readFile(filePath);
                const contentType = ext ? getContentTypeFromExt(ext) : detectContentType(file);
                res.header('Content-Type', contentType);
                return file;
            }
        } else if (host.endsWith('.point')) {
            // process other domains
            const version = (queryParams.__point_version as string) ?? 'latest';

            // First try route file (and check if this domain even exists)
            const zrouteId = await blockchain.getZRecord(host, version);
            if (!zrouteId) {
                return res.status(404).send('Domain not found (Route file not specified for this domain)');
            }

            log.debug({host, zrouteId}, 'Requesting ZRoute id for domain');
            const routes = await getJSON(zrouteId); // todo: check result
            if (!routes) {
                return res.status(404).send(`Cannot parse json of zrouteId ${zrouteId}`);
            }

            // Download info about root dir
            const rootDirId = await blockchain.getKeyValue(
                host,
                '::rootDir',
                version,
                'exact',
                true
            );
            if (!rootDirId) {
                // TODO: or 404 here?
                throw new Error(`Root dir id not found for host ${host}`);
            }

            const {routeParams, templateFilename, rewritedPath} = getParamsAndTemplate(
                routes,
                urlPath
            );

            if (rewritedPath) {
                urlPath = rewritedPath;
            }

            if (templateFilename) {
                const templateFileId = await getFileIdByPath(rootDirId, templateFilename);

                const templateFileContents = await getFile(templateFileId);
                const renderer = new Renderer({rootDirId} as any);

                const contentType = ext ? getContentTypeFromExt(ext) : 'text/html';
                res.header('Content-Type', contentType);

                // TODO: sanitize
                return await renderer.render(templateFileId, templateFileContents, host, {
                    ...routeParams,
                    ...queryParams,
                    ...((req.body as Record<string, unknown>) ?? {})
                });
            } else {
                // This is a static asset
                let renderedId;
                try {
                    renderedId = await getFileIdByPath(rootDirId, urlPath);
                } catch (e) {
                    // Handling the case with SPA reloaded on non-index page:
                    // we have to return index file, but without changing the URL
                    // to make client-side routing work
                    if (Object.keys(routes).length === 1) {
                        const {templateFilename: indexTemplate} = getParamsAndTemplate(routes, '/');

                        const templateFileId = await getFileIdByPath(rootDirId, indexTemplate);

                        const templateFileContents = await getFile(templateFileId);

                        const renderer = new Renderer({rootDirId} as any);

                        res.header('Content-Type', 'text/html');
                        // TODO: sanitize
                        return await renderer.render(templateFileId, templateFileContents, host, {
                            ...routeParams,
                            ...queryParams,
                            ...((req.body as Record<string, unknown>) ?? {})
                        });
                    } else {
                        // NOTE: silently move on since Object.keys(routes).length !==1
                    }
                }
                if (!renderedId) {
                    return res.status(404).send('Not found');
                }
                const file = await getFile(renderedId, null);

                const contentType = ext ? getContentTypeFromExt(ext) : detectContentType(file);
                res.header('Content-Type', contentType);
                return file;
            }
        } else if (host.endsWith('.sol') || host.endsWith('.eth')) {
            // For Solana/Ethereum domains, we store Point data in the domain registry.
            const service = host.endsWith('.sol') ? 'SNS' : 'ENS';
            let identity = '';
            let routesId: string | undefined;
            let rootDirId: string | undefined;
            let isAlias = false;

            try {
                const resp = await axios.get(`${API_URL}/v1/api/identity/resolve/${host}`);
                if (!resp.data.data?.content?.trim()) {
                    const msg = `No Point data found in the domain registry for "${host}".`;
                    log.debug({host}, msg);
                    return res.status(404).send(msg);
                }

                const pointData = parseDomainRegistry(resp.data.data);
                isAlias = pointData.isAlias;
                identity = pointData.identity ? `${pointData.identity}.point` : host;
                routesId = pointData.routesId;
                rootDirId = pointData.rootDirId;
                log.debug(
                    {host, identity, routesId, rootDirId, isAlias},
                    `Resolved ${service} domain`
                );
            } catch (err) {
                const statusCode = err.response?.data?.status || 500;
                const msg =
                    err.response?.data?.data?.errorMsg || `Error resolving "${service}" domain`;
                log.error(err, msg);
                return res.status(statusCode).send(msg);
            }

            // Return bad request if missing data in the domain registry.
            if (!isAlias && (!routesId || !rootDirId)) {
                // If the .sol domain is not an alias to a .point domain, all these
                // fields need to be present so that we can fetch the content.
                const msg = `Missing Point information in "${host}" domain registry.`;
                log.debug({host, identity, routesId, rootDirId, isAlias}, msg);
                return res.status(400).send(msg);
            }

            if (isAlias) {
                // .sol domain is an alias to a .point one, so we fetch the routes
                // and root directory from our Identity contract, as with any other
                // .point domain
                log.debug({host, identity}, `${service} domain is an alias`);
                const version = (queryParams.__point_version as string) ?? 'latest';

                routesId = (await blockchain.getZRecord(identity, version)) as string;
                if (!routesId) {
                    return res
                        .status(404)
                        .send('Domain not found (Route file not specified for this domain)');
                }

                rootDirId = await blockchain.getKeyValue(identity, '::rootDir', version);
                if (!rootDirId) {
                    return res.status(404).send(`Root dir id not found for host ${identity}`);
                }
            }

            // Fetch routes file
            const routes = await getJSON(routesId);
            if (!routes) {
                return res.status(404).send(`Cannot parse json of zrouteId ${routesId}`);
            }

            // Download info about root dir
            const {routeParams, templateFilename, rewritedPath} = getParamsAndTemplate(
                routes,
                urlPath
            );

            if (rewritedPath) {
                urlPath = rewritedPath;
            }

            if (templateFilename) {
                const templateFileId = await getFileIdByPath(rootDirId, templateFilename);
                const templateFileContents = await getFile(templateFileId);
                const renderer = new Renderer({rootDirId} as any);

                const contentType = ext ? getContentTypeFromExt(ext) : 'text/html';
                res.header('Content-Type', contentType);

                // TODO: sanitize
                return renderer.render(templateFileId, templateFileContents, identity, {
                    ...routeParams,
                    ...queryParams,
                    ...((req.body as Record<string, unknown>) ?? {})
                });
            } else {
                // This is a static asset
                let renderedId;
                try {
                    renderedId = await getFileIdByPath(rootDirId, urlPath);
                } catch (e) {
                    // Handling the case with SPA reloaded on non-index page:
                    // we have to return index file, but without changing the URL
                    // to make client-side routing work
                    if (Object.keys(routes).length === 1) {
                        const {templateFilename: indexTemplate} = getParamsAndTemplate(routes, '/');
                        const templateFileId = await getFileIdByPath(rootDirId, indexTemplate);
                        const templateFileContents = await getFile(templateFileId);
                        const renderer = new Renderer({rootDirId} as any);

                        res.header('Content-Type', 'text/html');
                        // TODO: sanitize

                        return await renderer.render(
                            templateFileId,
                            templateFileContents,
                            identity, {
                                ...routeParams,
                                ...queryParams,
                                ...((req.body as Record<string, unknown>) ?? {})
                            });
                    } else {
                        // NOTE: silently move on since Object.keys(routes).length !==1
                    }
                }

                if (!renderedId) {
                    return res.status(404).send('Not found');
                }

                const file = await getFile(renderedId, null);
                const contentType = ext ? getContentTypeFromExt(ext) : detectContentType(file);
                res.header('Content-Type', contentType);
                return file;
            }
        } else {
            if (host) {
                let urlMirrorUrl;

                try {
                    urlMirrorUrl = await getMirrorWeb2Page(req);
                } catch (error) {}

                if (urlMirrorUrl) {
                    // Set CORS headers
                    const allowedOrigin = req.headers.referer?.replace(/\/$/, '');
                    res.header('Vary', 'Origin');

                    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(String(req.urlData().host))) {
                        res.header('Access-Control-Allow-Origin', '*');
                    } else {
                        res.header('Access-Control-Allow-Origin', allowedOrigin);
                    }

                    // Redirect to mirror URL
                    res.redirect(urlMirrorUrl);
                    return;
                }

                if (host.startsWith('www.google.com') || host.startsWith('google.com')) {
                    res.redirect('https://search.point/search?q=' + queryParams?.q);
                    return;
                }

                const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
                const regex = new RegExp(expression);
                if (host.match(regex)) {
                    res.header('Content-Type', 'text/html');
                    let refererHost = req.headers.referer || '';
                    const matches = refererHost.match(/^https:\/\/(.*)\//);
                    if (matches) {
                        refererHost = matches[1];
                    }
                    return templateManager.render(Template.WEB2LINK, {
                        url: sanitizeUrl('http://' + host + (req.url ?? '')),
                        csrfToken: queryParams?.csrfToken,
                        host: refererHost
                    });
                }
            }
            return res.status(404).send('Not Found');
        }
    } catch (e) {
        log.error({stack: e.stack, errorMessage: e.message}, 'Proxy error');
        return res.status(500).send('Internal engine error: ' + JSON.stringify(e.message));
    }
};

export const wsConnections: Record<string, ZProxySocketController> = {};

const attachCommonHandler = (server: FastifyInstance) => {
    const handler = getHttpRequestHandler();
    const wsHandler = ({socket}: SocketStream, {hostname}: FastifyRequest) => {
        wsConnections[Math.random()] = new ZProxySocketController(
            socket,
            server.websocketServer,
            hostname
        );
    };

    // Handle websocket requests.
    server.route({
        method: 'GET',
        url: '/ws',
        preValidation: async (
            req: FastifyRequest<{Querystring: Record<string, string>}>,
            reply
        ) => {
            if (req.query.token !== config.get('api.sdk_auth_key')) {
                log.error('Invalid Client KEY for websocket connection.');
                await reply.status(401).send('not authenticated');
            }
        },
        handler: async () => undefined, // to avoid 'handler not defined' error.
        wsHandler
    });

    // Handle REST API requests.
    server.route({method: 'GET', url: '*', handler});
    server.route({method: 'POST', url: '*', handler});
};

export default attachCommonHandler;
