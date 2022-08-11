import {preHandlerHookHandler} from 'fastify';

/**
 * Allows Cross-Origin Requests to `https://mirror.point`.
 */
export const cors: preHandlerHookHandler = (req, res, done) => {
    const {host} = req.urlData();

    // Note: include original web2 urls too, not just web3 redirects, because otherwise the redirect won't even work, CORS check will kill it
    if (['mirror.point', 'gfontfiles.mirror.point', 'gfonts.mirror.point'].includes(String(host).toLowerCase())) {
        // Requests that are a result of a redirection during a CORS request
        // have the `Origin` header set to `null`.
        // Hence, we allow all origins (*) for `https://mirror.point`.
        res.header('Access-Control-Allow-Origin', '*');
    }

    done();
};
