import {onSendHookHandler} from 'fastify';

/**
 * Replaces the word "server" in error messages as
 * the concept of "server" is misleading in Web3.
 */
export const transformErrorResp: onSendHookHandler<unknown> = (_req, res, payload, done) => {
    if (res.statusCode >= 500 && typeof payload === 'string') {
        const updatedPayload = payload.replace(/server/gi, 'core');
        done(null, updatedPayload);
    } else {
        done();
    }
};
