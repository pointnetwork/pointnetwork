import {FastifyInstance, FastifyRequest} from 'fastify';
import {getNetworkAddress} from '../../../wallet/keystore';
import blockchain from '../../../network/blockchain';
const {uploadFile} = require('../../storage');

// TODO: ctx is needed for keyvalue, remove it
const attachKeyValueHanlders = (server: FastifyInstance, ctx: any) => {
    server.post(
        '/_keyvalue_append/:key',
        async (req: FastifyRequest<{Params: {key: string}; Body: Record<string, unknown>}>, res) => {
            if (req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
                return res.status(415).send('Only application/x-www-form-urlencoded is supported');
            }

            const identity = req.headers.host!.replace('.z', '');
            const key = req.params.key;
            const entries = req.body;

            const currentList = await ctx.keyvalue.list(identity, key);
            const newKey = `${key}${currentList?.length ?? 0}`;

            for (const k in entries) {
                if (k.startsWith('storage[')) {
                    const uploadedId = await uploadFile(entries[k]);

                    delete entries[k];
                    entries[k.replace('storage[', '').replace(']', '')] = uploadedId;
                }
            }

            const version = await blockchain
                // TODO: is it correct?
                .getKeyLastVersion(identity, '::rootDir') ?? 'latest';

            await ctx.keyvalue.propagate(identity, newKey, JSON.stringify({
                ...entries,
                __from: getNetworkAddress(),
                __time: Math.floor(Date.now() / 1000)
            }), version);

            res.status(200).send('Success');
        });

    server.get(
        '/_keyvalue_get/:key',
        async (req: FastifyRequest<{Params: {key: string}}>) =>
            ctx.keyvalue.get(req.headers.host!.replace('.z', ''), req.params.key)
    );
};

export default attachKeyValueHanlders;
