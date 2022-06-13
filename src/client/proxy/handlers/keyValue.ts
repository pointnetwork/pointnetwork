import {FastifyInstance, FastifyRequest} from 'fastify';
import {getNetworkAddress} from '../../../wallet/keystore';
import * as blockchain from '../../../network/providers/ethereum';
import keyValue from '../../../network/keyvalue';
import {Template, templateManager} from '../templateManager';
const {uploadFile} = require('../../storage');

const attachKeyValueHanlders = (server: FastifyInstance) => {
    server.post(
        '/_keyvalue_append/:key',
        async (
            req: FastifyRequest<{
                Params: {key: string};
                Body: Record<string, unknown>;
            }>,
            res
        ) => {
            if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
                return res.status(415).send('Only application/x-www-form-urlencoded is supported');
            }

            const identity = req.headers.host!.replace('.point', '');
            const key = req.params.key;
            const entries = req.body;

            const currentList = await keyValue.list(identity, key);
            const newKey = `${key}${currentList?.length ?? 0}`;

            let redirectUrl;
            for (const k in entries) {
                if (k.startsWith('storage[')) {
                    const uploadedId = await uploadFile(entries[k]);

                    delete entries[k];
                    entries[k.replace('storage[', '').replace(']', '')] = uploadedId;
                } else if (k === '__redirect') {
                    redirectUrl = entries[k];
                    delete entries[k];
                }
            }

            const version =
                (await blockchain
                    // TODO: is it correct?
                    .getKeyLastVersion(identity, '::rootDir')) ?? 'latest';

            await keyValue.propagate(
                identity,
                newKey,
                JSON.stringify({
                    ...entries,
                    __from: getNetworkAddress(),
                    __time: Math.floor(Date.now() / 1000)
                }),
                version
            );

            if (redirectUrl) {
                res.header('content-type', 'text/html');
                return templateManager.render(Template.REDIRECT, {redirectUrl});
            }
            res.status(200).send('Success');
        }
    );

    server.get('/_keyvalue_get/:key', async (req: FastifyRequest<{Params: {key: string}}>) =>
        keyValue.get(req.headers.host!.replace('.point', ''), req.params.key)
    );
};

export default attachKeyValueHanlders;
