import {FastifyReply, FastifyRequest} from 'fastify';
import fs from 'fs-extra';
import path from 'path';
import config from 'config';
import {verify} from 'jsonwebtoken';
import {resolveHome} from '../../../util';

let secretToken = '';

export const checkAuthToken = async (req: FastifyRequest, reply: FastifyReply) => {
    // TODO: make proper tests instead
    if (process.env.MODE === 'test') return;
    if (!secretToken) {
        secretToken = await fs.readFile(
            path.join(resolveHome(config.get('wallet.keystore_path')), 'token.txt'), 'utf8'
        );
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
