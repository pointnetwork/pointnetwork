/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import {promises as fs, existsSync, lstatSync} from 'fs';
import {parse, ParsedQuery} from 'query-string';
import axios from 'axios';
import {readFileByPath, splitAndTakeLastPart} from '../../../util';
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

interface DomainInfoPointers {
    host: string,
    routesId: string|undefined,
    rootDirId: string|undefined,
    identity: string
}

interface RequestFulfillmentConfig {
    req: FastifyRequest,
    res: FastifyReply,
    isLocal: boolean;
    routes: any,
    path: string,
    localRootDirPath?: string,
    remoteRootDirId?: string,
    rewriteHost?: string
}

const getHttpRequestHandler = () => async (req: FastifyRequest, res: FastifyReply) => {
    try {
        const {host, queryParams, urlPath} = await parseRequestForProxy(req);

        // Note: will not work for some modes, e.g. when MODE=zappdev and the site is loaded directly from the local file system
        const versionRequested = (queryParams.__point_version as string) ?? 'latest';

        if (!host) {
            throw Error('Host cannot be empty');

        } else if (host.endsWith('.z')) {
            res.header('Location', 'https://' + host.replace(/\.z/, '.point'));
            return res.status(301).send();

        } else if (host === 'point') {
            // Point Home

            // Edge case for web2redirect URI
            if (req.url.startsWith('/web2redirect')) {
                return await renderPointHomeWeb2RedirectPage(req, res);
            }

            // Point Home
            const publicPath = path.resolve(__dirname, '../../../../internal/explorer.point/public');

            return await fulfillRequest({
                req, res,
                isLocal: true,
                routes: {'/': 'index.zhtml', 'index.zhtml': 'index.zhtml'},
                path: urlPath,
                localRootDirPath: publicPath
            });

        } else if (host.endsWith('.local') || (config.get('mode') === 'zappdev' && host.endsWith('.point'))) {
            // First try route file (and check if this domain even exists)
            const routesId = await blockchain.getZRecord(host, versionRequested);
            if (!routesId && !host.endsWith('.local')) throw new HttpNotFoundError('Domain not found (Route file not specified for this domain)');

            const zappName = host.endsWith('dev') ? `${host.split('dev')[0]}.point` : host;

            const configZappsDir = config.has('zappsdir') ? String(config.get('zappsdir')) : '';
            let zappDir: string;
            if (configZappsDir === 'undefined' || configZappsDir === '' || configZappsDir === 'null') {
                zappDir = path.resolve(__dirname, `../../../../example/${zappName}`);
            } else {
                if (configZappsDir.startsWith('/') || configZappsDir.startsWith('~')) {
                    zappDir = path.resolve(configZappsDir, zappName);
                } else {
                    zappDir = path.resolve(__dirname, `../../../../${configZappsDir}/${zappName}`);
                }
            }

            const deployJsonPath = path.resolve(zappDir, 'point.deploy.json');
            const deployConfig = JSON.parse(await fs.readFile(deployJsonPath, 'utf8'));
            let rootDirPath = 'public';
            if (deployConfig.hasOwnProperty('rootDir') && deployConfig.rootDir !== '') {
                rootDirPath = deployConfig.rootDir;
            }

            const publicPath = path.resolve(zappDir, rootDirPath);
            if (!existsSync(publicPath)) {
                throw new Error('Public path ' + publicPath + ' doesnt exist.');
            }

            const routesJsonPath = path.resolve(zappDir, 'routes.json');
            if (!existsSync(routesJsonPath)) {
                throw new Error('Routes file ' + routesJsonPath + ' doesnt exist.');
            }

            const routes = JSON.parse(await fs.readFile(routesJsonPath, 'utf8'));

            return await fulfillRequest({
                req, res,
                isLocal: true,
                routes,
                path: urlPath,
                localRootDirPath: publicPath
            });

        } else if (host.endsWith('.point')) {
            // First try route file (and check if this domain even exists)
            const zrouteId = await blockchain.getZRecord(host, versionRequested);
            if (!zrouteId) throw new HttpNotFoundError('Domain not found (Route file not specified for this domain)');

            log.debug({host, zrouteId}, 'Requesting ZRoute id for domain');
            const routes = await getJSON(zrouteId);
            if (!routes) throw new HttpNotFoundError(`Cannot parse json of zrouteId ${zrouteId}`);

            // Download info about root dir
            const rootDirId = await blockchain.getKeyValue(
                host,
                '::rootDir',
                versionRequested,
                'exact',
                true
            );
            if (!rootDirId) throw new HttpNotFoundError(`Root dir id not found for host ${host}`);

            return await fulfillRequest({
                req, res,
                isLocal: false,
                routes,
                path: urlPath,
                remoteRootDirId: rootDirId
            });

        } else if (host.endsWith('.sol') || host.endsWith('.eth')) {
            const {routesId, rootDirId, identity} = await queryExtDomain(host, queryParams);

            // Fetch routes file
            const routes = await getJSON(routesId);
            if (!routes) throw new HttpNotFoundError(`Cannot parse json of zrouteId ${routesId}`);

            return await fulfillRequest({
                req, res,
                isLocal: false,
                routes,
                path: urlPath,
                remoteRootDirId: rootDirId,
                rewriteHost: identity
            });

        } else {
            // Web2?
            let urlMirrorUrl;
            try { urlMirrorUrl = await getMirrorWeb2Page(req); } catch (error) { /* ignore */ }
            if (urlMirrorUrl) {
                // Set CORS headers
                const allowedOrigin = req.headers.referer?.replace(/\/$/, '');
                res.header('Vary', 'Origin');

                const allowCORS = ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(String(req.urlData().host));
                res.header('Access-Control-Allow-Origin', (allowCORS) ? '*' : allowedOrigin);

                // Redirect to mirror URL
                return res.redirect(urlMirrorUrl);
            }

            if (host.startsWith('www.google.com') || host.startsWith('google.com')) {
                return res.redirect('https://search.point/search?q=' + queryParams?.q);
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
            } else {
                throw new HttpNotFoundError('Could not match requested tld with any programmed case');
            }
        }

    } catch (e) {
        const status = (e.name === 'HttpNotFoundError') ? 404 : 500;
        const errorTypeText = (e.name === 'HttpNotFoundError') ? 'Not Found' : 'Backend Error';
        log.error({stack: e.stack, errorMessage: e.message}, 'Proxy error: ' + errorTypeText);
        return res.status(status).send(errorTypeText + ': ' + JSON.stringify(e.message).replace(/^"+|"+$/g, ''));
    }
};

const fulfillRequest = async(cfg: RequestFulfillmentConfig) => {
    const {req, res} = cfg;

    let {host, queryParams, ext} = await parseRequestForProxy(req);
    if (cfg.rewriteHost) host = cfg.rewriteHost;

    // Download info about root dir
    let {routeParams, templateFilename, possiblyRewrittenUrlPath: urlPath} = getParamsAndTemplate(
        cfg.routes,
        cfg.path
    );

    // TODO: Undocumented!
    // Handling the case with SPA reloaded on non-index page:
    // we have to return index file, but without changing the URL
    // to make client-side routing work
    if (Object.keys(cfg.routes).length === 1) {
        ({templateFilename} = getParamsAndTemplate(cfg.routes, '/'));
    } else {
        // NOTE: silently move on since Object.keys(routes).length !==1
    }

    if (templateFilename) {
        // This is a ZHTML file
        let templateFileContents, templateId;
        if (cfg.isLocal) {
            // Local
            if (!cfg.localRootDirPath) throw new Error('localRootDirPath cannot be empty');

            templateId = templateFilename;

            templateFileContents = await readFileByPath(
                cfg.localRootDirPath,
                `${templateFilename}`,
                'utf-8'
            );
        } else {
            // Remote
            templateId = await getFileIdByPath(cfg.remoteRootDirId, templateFilename);
            if (!templateId) throw new HttpNotFoundError(`Cannot getFileIdByPath: ${templateFilename}`);

            templateFileContents = await getFile(templateId);
        }

        let renderer;
        if (cfg.isLocal) {
            renderer = new Renderer({localDir: cfg.localRootDirPath} as any);
        } else {
            renderer = new Renderer({rootDirId: cfg.remoteRootDirId} as any);
        }

        const contentType = ext ? getContentTypeFromExt(ext) : 'text/html';
        res.header('Content-Type', contentType);

        // TODO: sanitize
        return await renderer.render(templateId, templateFileContents, host, {
            ...routeParams,
            ...queryParams,
            ...((req.body as Record<string, unknown>) ?? {})
        });
    } else {
        // This is a static asset
        let file;
        if (cfg.isLocal) {
            // This is a static asset
            if (!cfg.localRootDirPath) throw new Error('localRootDirPath cannot be empty');

            const filePath = path.join(cfg.localRootDirPath, urlPath);
            if (! existsSync(filePath)) return res.status(404).send('Not Found');
            if (! lstatSync(filePath).isFile()) return res.status(403).send('Directory listing not allowed');

            file = await fs.readFile(filePath);

        } else {
            const fileId = await getFileIdByPath(cfg.remoteRootDirId, urlPath);
            if (!fileId) throw new HttpNotFoundError('File not found by this path');

            file = await getFile(fileId, null);
        }

        const contentType = ext ? getContentTypeFromExt(ext) : detectContentType(file);
        res.header('Content-Type', contentType);

        return file;
    }
};

const queryExtDomain = async (host: string, queryParams: ParsedQuery<string>): Promise<DomainInfoPointers> => {
    // For Solana/Ethereum domains, we store Point data in the domain registry.
    const service = host.endsWith('.sol') ? 'SNS' : 'ENS';
    let identity = '';
    let routesId: string | undefined;
    let rootDirId: string | undefined;
    let isAlias = false;

    const resp = await axios.get(`${API_URL}/v1/api/identity/resolve/${host}`);
    if (!resp.data.data?.content?.trim()) {
        log.debug({host}, `No Point data found in the domain registry for "${host}".`);
        throw new HttpNotFoundError(`No Point data found in the domain registry for "${host}".`);
    }

    const domainData = parseDomainRegistry(resp.data.data);
    isAlias = domainData.isAlias;
    identity = domainData.identity ? `${domainData.identity}.point` : host;
    routesId = domainData.routesId;
    rootDirId = domainData.rootDirId;
    log.debug(
        {host, identity, routesId, rootDirId, isAlias},
        `Resolved ${service} domain`
    );

    // Return bad request if missing data in the domain registry.
    if (!isAlias && (!routesId || !rootDirId)) {
        // If the .sol domain is not an alias to a .point domain, all these
        // fields need to be present so that we can fetch the content.
        const msg = `Missing Point information in "${host}" domain registry.`;
        log.debug({host, identity, routesId, rootDirId, isAlias}, msg);
        throw new HttpNotFoundError(msg);
    }

    if (isAlias) {
        // .sol domain is an alias to a .point one, so we fetch the routes
        // and root directory from our Identity contract, as with any other
        // .point domain
        log.debug({host, identity}, `${service} domain is an alias`);
        const version = (queryParams.__point_version as string) ?? 'latest';

        routesId = (await blockchain.getZRecord(identity, version)) as string;
        if (!routesId) throw new HttpNotFoundError('Domain not found (Route file not specified for this domain)');

        rootDirId = await blockchain.getKeyValue(identity, '::rootDir', version);
        if (!rootDirId) throw new HttpNotFoundError(`Root dir id not found for host ${identity}`);
    }

    return {host, routesId, rootDirId, identity};
};

const parseRequestForProxy = async (req: FastifyRequest) => {
    const host = req.headers.host!;
    const urlData = req.urlData();
    const queryParams = parse(urlData.query ?? '');
    const urlPath = urlData.path ?? '';
    const fileName = splitAndTakeLastPart(urlPath, '/')!;
    const ext = splitAndTakeLastPart(fileName, '.', null);

    return {host, urlData, queryParams, urlPath, fileName, ext};
};

const renderPointHomeWeb2RedirectPage = async (req: FastifyRequest, res: FastifyReply) => {
    const {queryParams} = await parseRequestForProxy(req);

    res.header('Content-Type', 'text/html');
    let refererHost = req.headers.referer || '';
    const matches = refererHost.match(/^https:\/\/(.*)\//);
    if (matches) {
        refererHost = matches[1];
    }
    return templateManager.render(Template.WEB2LINK, {
        url: queryParams?.url,
        csrfToken: queryParams?.csrfToken,
        host: refererHost
    });
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
