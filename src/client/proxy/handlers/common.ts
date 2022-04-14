import path from 'path';
import {promises as fs} from 'fs';
import {parse} from 'query-string';
import {makeSurePathExists, readFileByPath} from '../../../util';
import {FastifyInstance} from 'fastify';
import Renderer from '../../zweb/renderer';
import logger from '../../../core/log';
import blockchain from '../../../network/blockchain';
import {getContentTypeFromExt, getParamsAndTemplate} from '../proxyUtils';
// @ts-expect-error no types for package
import {detectContentType} from 'detect-content-type';
import config from 'config';

const {getJSON, getFileIdByPath, getFile} = require('../../storage');
const log = logger.child({module: 'ZProxy'});

// TODO: ctx is needed for Renderer, remove it later
const attachCommonHandler = (server: FastifyInstance, ctx: any) => {
    server.route({
        method: ['GET', 'POST'],
        url: '*',
        handler: async (req, res) => {
            try {
                const host = req.headers.host!;
                const urlData = req.urlData();
                const queryParams = parse(urlData.query ?? '');
                const urlPath = urlData.path!;
                const fileName = urlPath.split('/')[urlPath.split('/').length - 1];
                const ext = fileName.split('.').length > 1
                    ? fileName.split('.')[fileName.split('.').length - 1]
                    : null;

                if (host === 'point') {
                    // Process internal point webpage
                    const publicPath = path.resolve(__dirname, '../../../../internal/explorer.point/public');
                    const routesJsonPath = path.resolve(publicPath, '../routes.json');
                    const routes = JSON.parse(await fs.readFile(routesJsonPath, 'utf8'));

                    const {
                        routeParams,
                        templateFilename
                    } = getParamsAndTemplate(routes, urlPath);

                    if (templateFilename) {
                        // This is a ZHTML file
                        const templateFileContents = await readFileByPath(
                            publicPath,
                            `${templateFilename}`,
                            'utf-8'
                        );

                        const renderer = new Renderer(ctx, {localDir: publicPath} as any);

                        res.header('Content-Type', 'text/html');
                        // TODO: sanitize
                        return renderer.render(
                            templateFilename,
                            templateFileContents,
                            host,
                            {
                                ...routeParams,
                                ...queryParams
                            }
                        );
                    } else {
                        // This is a static asset
                        const filePath = path.join(publicPath, urlPath);
                        try {
                            await makeSurePathExists(filePath);
                        } catch (e) {
                            res.status(404).send('Not Found');
                        }

                        const file = await fs.readFile(filePath);
                        const contentType = ext
                            ? getContentTypeFromExt(ext)
                            : detectContentType(file);

                        res.header('content-type', contentType);
                        return file;
                    }
                } else if (host.endsWith('.z')) {
                    res.header('Location', 'https://' + host.replace(/\.z/, '.point'));
                    res.status(301).send();
                } else if (config.get('mode') === 'zappdev' && host.endsWith('.point')) {
                    // when MODE=zappdev is set this site will be loaded directly from the local system - useful for Zapp developers :)
                    // Side effect: versionig of zapps will not work for Zapp files in this env since files are loaded from local file system.
                    const version = queryParams.__point_version as string ?? 'latest';

                    // First try route file (and check if this domain even exists)
                    const zrouteId = await blockchain.getZRecord(host, version);

                    if (!zrouteId) {
                        res.status(404).send('Domain not found (Route file not specified for this domain)');
                    }

                    const zappName = host.includes('dev') ? `${host.split('dev')[0]}.point` : host;

                    const zappsDir: string = config.get('zappsdir');
                    let zappDir: string;
                    if (zappsDir !== undefined && zappsDir !== ''){
                        if (zappsDir.startsWith('/') || zappsDir.startsWith('~')){
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
                    if (deployConfig.hasOwnProperty('rootDir') && deployConfig.rootDir !== ''){
                        rootDir = deployConfig.rootDir;
                    }

                    const publicPath = path.resolve(zappDir, rootDir);
                    const routesJsonPath = path.resolve(zappDir, 'routes.json');
                    const routes = JSON.parse(await fs.readFile(routesJsonPath, 'utf8'));

                    const {
                        routeParams,
                        templateFilename
                    } = getParamsAndTemplate(routes, urlPath);

                    if (templateFilename) {
                        // This is a ZHTML file
                        const templateFileContents = await readFileByPath(
                            publicPath,
                            `${templateFilename}`,
                            'utf-8'
                        );

                        const renderer = new Renderer(ctx, {localDir: publicPath} as any);

                        res.header('Content-Type', 'text/html');
                        // TODO: sanitize
                        return renderer.render(
                            templateFilename,
                            templateFileContents,
                            host,
                            {
                                ...routeParams,
                                ...queryParams,
                                ...(req.body as Record<string, unknown> ?? {})
                            }
                        );
                    } else {
                        // This is a static asset
                        const filePath = path.join(publicPath, urlPath);
                        try {
                            await makeSurePathExists(filePath);
                        } catch (e) {
                            res.status(404).send('Not Found');
                        }

                        const file = await fs.readFile(filePath);
                        const contentType = ext
                            ? getContentTypeFromExt(ext)
                            : detectContentType(file);
                        res.header('content-type', contentType);
                        return file;
                    }
                } else if (host.endsWith('.point')) {
                    // process other domains
                    const version = queryParams.__point_version as string ?? 'latest';

                    // First try route file (and check if this domain even exists)
                    const zrouteId = await blockchain.getZRecord(host, version);

                    if (!zrouteId) {
                        res.status(404).send('Domain not found (Route file not specified for this domain)');
                    }

                    log.debug({host, zrouteId}, 'Requesting ZRoute id for domain');

                    const routes = await getJSON(zrouteId); // todo: check result
                    if (!routes) {
                        res.status(404).send(
                            `Cannot parse json of zrouteId ${zrouteId}`
                        );
                    }

                    // Download info about root dir
                    const rootDirId = await blockchain.getKeyValue(host, '::rootDir', version);
                    if (!rootDirId) {
                        // TODO: or 404 here?
                        throw new Error(`Root dir id not found for host ${host}`);
                    }

                    const {
                        routeParams,
                        templateFilename
                    } = getParamsAndTemplate(routes, urlPath);

                    if (templateFilename) {
                        const templateFileId = await getFileIdByPath(
                            rootDirId,
                            templateFilename
                        );

                        const templateFileContents = await getFile(templateFileId);

                        const renderer = new Renderer(ctx, {rootDirId} as any);

                        res.header('Content-Type', 'text/html');
                        // TODO: sanitize
                        return renderer.render(
                            templateFileId,
                            templateFileContents,
                            host,
                            {
                                ...routeParams,
                                ...queryParams,
                                ...(req.body as Record<string, unknown> ?? {})
                            }
                        );
                    } else {
                        // This is a static asset
                        let renderedId;
                        try {
                            renderedId = await getFileIdByPath(rootDirId, urlPath);
                        } catch (e) {
                            // Handling the case with SPA reloaded on non-index page:
                            // we have to return index file, but without changin the URL
                            // to make client-side routing work
                            if (Object.keys(routes).length === 1) {
                                const {templateFilename: indexTemplate} = getParamsAndTemplate(routes, '/');

                                const templateFileId = await getFileIdByPath(
                                    rootDirId,
                                    indexTemplate
                                );

                                const templateFileContents = await getFile(templateFileId);

                                const renderer = new Renderer(ctx, {rootDirId} as any);

                                res.header('Content-Type', 'text/html');
                                // TODO: sanitize
                                return renderer.render(
                                    templateFileId,
                                    templateFileContents,
                                    host,
                                    {
                                        ...routeParams,
                                        ...queryParams,
                                        ...(req.body as Record<string, unknown> ?? {})
                                    }
                                );
                            }
                        }
                        if (!renderedId) {
                            return res.status(404).send('Not found');
                        }
                        const file = await getFile(renderedId, null);

                        const contentType = ext
                            ? getContentTypeFromExt(ext)
                            : detectContentType(file);
                        res.header('content-type', contentType);
                        return file;
                    }
                } else {
                    res.status(404).send('Not Found');
                }
            } catch (e) {
                log.error('Proxy internal server error');
                log.error(e);
                res.status(500).send('Internal server error');
            }
        }
    });
};

export default attachCommonHandler;
