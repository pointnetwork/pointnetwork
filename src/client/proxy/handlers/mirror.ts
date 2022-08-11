import {parse} from 'query-string';
import {FastifyRequest} from 'fastify';
import blockchain from '../../../network/providers/ethereum';
import config from 'config';
const {getJSON, getFileIdByPath} = require('../../storage');

const CACHE_EXPIRATION =
    parseInt(config.get('storage.mirror_cache_expiration'), 10) || 1000 * 60 * 5;

type MirrorEntry = {
    id: string;
    src: string;
    validation: string[];
    frequency: string;
};

let web2mirror: MirrorEntry[] | null;
async function getWeb2MirrorContent() {
    if (web2mirror) {
        return web2mirror;
    }
    const rootDirId = await blockchain.getKeyValue('mirror.point', '::rootDir', 'latest');
    const mirrorFileId = await getFileIdByPath(rootDirId, 'mirrors.json');
    web2mirror = await getJSON(mirrorFileId);
    setTimeout(() => {
        web2mirror = null;
    }, CACHE_EXPIRATION);
    return web2mirror;
}

export async function getMirrorWeb2Page(req: FastifyRequest) {
    const urlData = req.urlData();
    const host = String(urlData.host);
    const queryParams = parse(urlData.query ?? '');

    // Some hardcoded domains
    const FULL_DOMAIN_REDIRECTS : Record<string, string> = {
        'fonts.googleapis.com': 'gfonts.mirror.point',
        'fonts.gstatic.com': 'gfontfiles.mirror.point'
    };
    if (host.toLowerCase() in FULL_DOMAIN_REDIRECTS) {
        const redirectedHost = FULL_DOMAIN_REDIRECTS[ host.toLowerCase() ];
        let url = req.raw.url ?? '';
        if (host === 'fonts.googleapis.com') {
            url = url.replace('/css', '/css.css');
            url = url.replace('/css2', '/css2.css');
        }
        return 'https://' + redirectedHost + (!url.startsWith('/') ? '/' : '') + url;
    }

    if (queryParams.mirror === 'false') {
        return;
    }

    const web2mirror = await getWeb2MirrorContent();

    const urlMirror = web2mirror?.find(
        ({src}) => src === `${req.protocol}://${urlData.host}${urlData.path}`
    );
    if (!urlMirror) {
        return;
    }
    return `https://mirror.point/data/${urlMirror.id}${urlData.query ? `?${urlData.query}` : ''}`;
}
