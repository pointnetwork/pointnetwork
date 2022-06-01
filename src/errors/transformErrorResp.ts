import {onSendHookHandler} from 'fastify';

/**
 * Overrides 5xx error codes as they refer to "server errors"
 * and the concept of "server" is misleading in Web3.
 * Also, replace the word "server" in error messages.
 */
export const transformErrorResp: onSendHookHandler<unknown> = (_req, res, payload, done) => {
    if (res.statusCode >= 500) {
        res.code(400);
    }

    if (typeof payload === 'string') {
        const updatedPayload = payload.replace(/server/gi, 'core');
        done(null, updatedPayload);
    } else {
        done();
    }
};
