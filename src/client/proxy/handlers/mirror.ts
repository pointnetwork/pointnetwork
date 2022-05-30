import {parse} from 'query-string';
import {FastifyRequest} from 'fastify';
import blockchain from '../../../network/providers/ethereum';
const {getJSON, getFileIdByPath} = require('../../storage');

const CACHE_EXPIRATION = 1000 * 60 * 5; // FIVE MINUTES

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
    const queryParams = parse(urlData.query ?? '');
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
    return `https://mirror.point/data/${urlMirror.id}${urlData ? `?${urlData.query}` : ''}`;
}
