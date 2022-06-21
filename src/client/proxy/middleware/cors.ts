import {preHandlerHookHandler} from 'fastify';

/**
 * Allows Cross-Origin Requests to `https://mirror.point`.
 */
export const cors: preHandlerHookHandler = (req, res, done) => {
    const protocol = req.protocol;
    const {host} = req.urlData();

    if (`${protocol}://${host}` === 'https://mirror.point') {
        // Requests that are a result of a redirection during a CORS request
        // have the `Origin` header set to `null`.
        // Hence, we allow all origins (*) for `https://mirror.point`.
        res.header('Access-Control-Allow-Origin', '*');
    }

    done();
};
