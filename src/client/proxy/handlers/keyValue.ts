import {FastifyInstance, FastifyRequest} from 'fastify';
import {getNetworkAddress} from '../../../wallet/keystore';
import blockchain from '../../../network/blockchain';

const attachKeyValueHanlders = (server: FastifyInstance, ctx: any) => {
    server.post(
        '/_keyvalue_append/:key',
        async (req: FastifyRequest<{Params: {key: string}; Body: Record<string, unknown>}>, res) => {
            if (req.headers['content-type'] !== 'application/json') {
                return res.status(400).send('Only application/json is supported');
            }

            const identity = req.headers.host!.replace('.z', '');
            const key = req.params.key;

            const currentList = await ctx.keyvalue.list(identity, key);
            const newKey = `${key}${currentList?.length ?? 0}`;

            const version = await blockchain
                // TODO: is it correct?
                .getKeyLastVersion(identity, '::rootDir') ?? 'latest';

            await ctx.keyvalue.propagate(identity, newKey, JSON.stringify({
                ...req.body,
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
