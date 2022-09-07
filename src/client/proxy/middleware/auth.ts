import {FastifyReply, FastifyRequest} from 'fastify';
import {verify} from 'jsonwebtoken';
import {getSecretToken} from '../../../util';

let secretToken = '';

export const checkAuthToken = async (req: FastifyRequest, reply: FastifyReply) => {
    // TODO: make proper tests instead
    if (process.env.MODE === 'test') return;
    if (!secretToken) {
        secretToken = await getSecretToken();
    }
    const jwt = req.headers['x-point-token'] as string;
    if (!jwt) {
        reply.status(401).send('Unauthorized');
        return;
    }
    try {
        verify(jwt.replace(/^Bearer\s/, ''), secretToken);
    } catch (e) {
        reply.status(401).send('Unauthorized');
    }
};
