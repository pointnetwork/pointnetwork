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
import {getContentTypeFromExt, matchRouteAndParams} from '../proxyUtils';
// @ts-expect-error no types for package
import detectContentType from 'detect-content-type';
import config from 'config';
import {Template, templateManager} from '../templateManager';
import {getMirrorWeb2Page} from './mirror';
import {parseDomainRegistry} from '../../../name_service/registry';
import {HttpForbiddenError, HttpNotFoundError} from '../../../core/exceptions';
import csrfTokens from '../../zweb/renderer/csrfTokens';
import {randomBytes} from 'crypto';
const {getJSON, getFileIdByPath, getFile} = require('../../storage');
const sanitizeUrl = require('@braintree/sanitize-url').sanitizeUrl;

const log = logger.child({module: 'ZProxy'});

const API_URL = `http://${config.get('api.address')}:${config.get('api.port')}`;

interface DomainInfoPointers {
    host: string;
    routesId: string | undefined;
    rootDirId: string | undefined;
    identity: string;
}

interface RequestFulfillmentConfig {
    req: FastifyRequest;
    res: FastifyReply;
    isLocal: boolean;
    routes: any;
    path: string;
    localRootDirPath?: string;
    remoteRootDirId?: string;
    rewriteHost?: string;
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
            const publicPath = path.resolve(
                __dirname,
                '../../../../internal/explorer.point/public'
            );

            return await fulfillRequest({
                req,
                res,
                isLocal: true,
                routes: {'*': 'index.zhtml'},
                path: urlPath,
                localRootDirPath: publicPath
            });
        } else if (
            host.endsWith('.local') ||
            (config.get('mode') === 'zappdev' && host.endsWith('.point'))
        ) {
            // First try route file (and check if this domain even exists)
            const routesId = await blockchain.getZRecord(host, versionRequested);
            if (!routesId && !host.endsWith('.local')) {
                throw new HttpNotFoundError(
                    'Domain not found (Route file not specified for this domain)'
                );
            }

            const zappName = host.endsWith('dev') ? `${host.split('dev')[0]}.point` : host;

            const configZappsDir: string = config.has('zappsdir') ? config.get('zappsdir') : '';
            let zappDir: string;
            if (configZappsDir) {
                if (configZappsDir.startsWith('/') || configZappsDir.startsWith('~')) {
                    zappDir = path.resolve(configZappsDir, zappName);
                } else {
                    zappDir = path.resolve(__dirname, `../../../../${configZappsDir}/${zappName}`);
                }
            } else {
                zappDir = path.resolve(__dirname, `../../../../example/${zappName}`);
            }

            const deployJsonPath = path.resolve(zappDir, 'point.deploy.json');
            const deployConfig = JSON.parse(await fs.readFile(deployJsonPath, 'utf8'));
            let rootDirPath = 'public';
            if (deployConfig.hasOwnProperty('rootDir') && deployConfig.rootDir !== '') {
                rootDirPath = deployConfig.rootDir;
            }

            const publicPath = path.resolve(zappDir, rootDirPath);
            if (!existsSync(publicPath)) {
                throw new Error(`Public path ${publicPath} doesn't exist`);
            }

            const routesJsonPath = path.resolve(zappDir, 'routes.json');
            if (!existsSync(routesJsonPath)) {
                throw new Error(`Routes file ${routesJsonPath} doesn't exist`);
            }

            const routes = JSON.parse(await fs.readFile(routesJsonPath, 'utf8'));

            return await fulfillRequest({
                req,
                res,
                isLocal: true,
                routes,
                path: urlPath,
                localRootDirPath: publicPath
            });
        } else if (host.endsWith('.point')) {
            // First try route file (and check if this domain even exists)
            const zrouteId = await blockchain.getZRecord(host, versionRequested);
            if (!zrouteId) {
                throw new HttpNotFoundError(
                    'Domain not found (Route file not specified for this domain)'
                );
            }

            log.trace({host, zrouteId}, 'Requesting ZRoute id for domain');
            const routes = await getJSON(zrouteId);
            if (!routes) {
                throw new HttpNotFoundError(`Cannot parse json of zrouteId ${zrouteId}`);
            }

            // Download info about root dir
            const rootDirId = await blockchain.getKeyValue(
                host,
                '::rootDir',
                versionRequested,
                'exact',
                true
            );
            if (!rootDirId) {
                throw new HttpNotFoundError(`Root dir id not found for host ${host}`);
            }

            return await fulfillRequest({
                req,
                res,
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
                req,
                res,
                isLocal: false,
                routes,
                path: urlPath,
                remoteRootDirId: rootDirId,
                rewriteHost: identity
            });
        } else {
            // Web2?
            let urlMirrorUrl;
            try {
                urlMirrorUrl = await getMirrorWeb2Page(req);
            } catch (error) {
                /* ignore */
            }
            if (urlMirrorUrl) {
                // Set CORS headers
                const allowedOrigin = req.headers.referer?.replace(/\/$/, '');
                res.header('Vary', 'Origin');

                const allowCORS = ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(
                    String(req.urlData().host)
                );
                res.header('Access-Control-Allow-Origin', allowCORS ? '*' : allowedOrigin);

                // Redirect to mirror URL
                return res.redirect(urlMirrorUrl);
            }

            if (host.startsWith('www.google.com') || host.startsWith('google.com')) {
                const q = queryParams?.q || '';
                if (typeof q === 'string' && (q.endsWith('.sol') || q.endsWith('.point'))) {
                    return res.redirect(`https://${q}`);
                }
                return res.redirect('https://search.point/search?q=' + q);
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
                if (!csrfTokens.point) {
                    csrfTokens.point = randomBytes(64).toString('hex');
                }
                return templateManager.render(Template.WEB2LINK, {
                    url: sanitizeUrl('http://' + host + (req.url ?? '')),
                    csrfToken: csrfTokens.point,
                    host: refererHost
                });
            } else {
                throw new HttpNotFoundError(
                    'Could not match requested tld with any programmed case'
                );
            }
        }
    } catch (e) {
        const status = e.httpStatusCode || 500;
        log.error({stack: e.stack, errorMessage: e.message}, 'Error from Renderer');
        return res
            .status(status)
            .send('Error from Renderer: ' + JSON.stringify(e.message).replace(/^"+|"+$/g, ''));
    }
};

const tryFulfillZhtmlRequest = async (
    cfg: RequestFulfillmentConfig,
    templateFilename: string,
    routeParams: Record<string, string> | null,
    host: string
) => {
    const {req, res} = cfg;
    const {queryParams} = await parseRequestForProxy(req);

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

    res.header('Content-Type', 'text/html');

    // TODO: sanitize
    return await renderer.render(templateId, templateFileContents, host, {
        ...routeParams,
        ...queryParams,
        ...((req.body as Record<string, unknown>) ?? {})
    });
};

const tryFulfillStaticRequest = async (cfg: RequestFulfillmentConfig, urlPath: string) => {
    const {req, res} = cfg;
    const {ext} = await parseRequestForProxy(req);

    let file;
    if (cfg.isLocal) {
        // This is a static asset
        if (!cfg.localRootDirPath) {
            throw new Error('localRootDirPath cannot be empty');
        }

        const filePath = path.join(cfg.localRootDirPath, urlPath);
        if (!existsSync(filePath)) {
            throw new HttpNotFoundError('Not Found');
        }

        if (!lstatSync(filePath).isFile()) {
            throw new HttpForbiddenError('Directory listing not allowed');
        }

        file = await fs.readFile(filePath);
    } else {
        const fileId = await getFileIdByPath(cfg.remoteRootDirId, urlPath);
        if (!fileId) {
            throw new HttpNotFoundError('File not found by this path');
        }

        file = await getFile(fileId, null);
    }

    let contentType = detectContentType(file);
    if (contentType.match('text/plain') && ext) {
        contentType = getContentTypeFromExt(ext);
    }
    res.header('Content-Type', contentType);

    return file;
};

const fulfillRequest = async (cfg: RequestFulfillmentConfig) => {
    const {req} = cfg;

    let {host} = await parseRequestForProxy(req);
    if (cfg.rewriteHost) host = cfg.rewriteHost;

    // We're only trying to match routes this early because of possible :rewrite:, which applies to static too
    const {routeParams, templateFilename, possiblyRewrittenUrlPath: urlPath} = matchRouteAndParams(
        cfg.routes,
        cfg.path
    );

    // First try static assets
    try {
        return await tryFulfillStaticRequest(cfg, urlPath);
    } catch (e) {
        if (e instanceof HttpNotFoundError || e instanceof HttpForbiddenError) {
            // HttpNotFoundError - we didn't find any static file by that path
            // HttpForbiddenError - e.g. when calling '/' ("Directory listing not allowed)
            if (templateFilename) {
                return await tryFulfillZhtmlRequest(cfg, templateFilename, routeParams, host);
            } else {
                throw e; // Nothing matched
            }
        } else {
            throw e; // unknown error
        }
    }
};

const queryExtDomain = async (
    host: string,
    queryParams: ParsedQuery<string>
): Promise<DomainInfoPointers> => {
    // For Solana/Ethereum domains, we store Point data in the domain registry.
    const service = host.endsWith('.sol') ? 'SNS' : 'ENS';
    let identity = '';
    let routesId: string | undefined;
    let rootDirId: string | undefined;
    let isAlias = false;

    const resp = await axios.get(`${API_URL}/v1/api/identity/resolve/${host}`);
    if (!resp.data.data?.content?.trim()) {
        throw new HttpNotFoundError(`No Point data found in the domain registry for "${host}".`);
    }

    const domainData = parseDomainRegistry(resp.data.data);
    isAlias = domainData.isAlias;
    identity = domainData.identity ? `${domainData.identity}.point` : host;
    routesId = domainData.routesId;
    rootDirId = domainData.rootDirId;
    log.debug({host, identity, routesId, rootDirId, isAlias}, `Resolved ${service} domain`);

    // Return bad request if missing data in the domain registry.
    if (!isAlias && (!routesId || !rootDirId)) {
        // If the .sol domain is not an alias to a .point domain, all these
        // fields need to be present so that we can fetch the content.
        const msg = `Missing Point information in "${host}" domain registry.`;
        // log.debug({host, identity, routesId, rootDirId, isAlias}, msg);
        throw new HttpNotFoundError(
            msg + ' : ' + JSON.stringify({host, identity, routesId, rootDirId, isAlias})
        );
    }

    if (isAlias) {
        // .sol domain is an alias to a .point one, so we fetch the routes
        // and root directory from our Identity contract, as with any other
        // .point domain
        log.debug({host, identity}, `${service} domain is an alias`);
        const version = (queryParams.__point_version as string) ?? 'latest';

        routesId = (await blockchain.getZRecord(identity, version)) as string;
        if (!routesId) {
            throw new HttpNotFoundError(
                'Domain not found (Route file not specified for this domain)'
            );
        }

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
        handler: async () => undefined, // to avoid 'handler not defined' error.
        wsHandler
    });

    // Handle REST API requests.
    server.route({method: 'GET', url: '*', handler});
    server.route({method: 'POST', url: '*', handler});
};

export default attachCommonHandler;
