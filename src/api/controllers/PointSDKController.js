import config from 'config';
import csrfTokens from '../../client/zweb/renderer/csrfTokens';

class PointSDKController {
    constructor(req) {
        this.status = 200;

        const host = req.headers.host;
        const method = req.method.toUpperCase();

        if (method === 'POST' && config.get('api.csrf_enabled')) {
            const csrfToken = req.body._csrf;
            this.csrfTokenGuard(host, csrfToken);
        }
    }

    csrfTokenGuard(host, submittedToken) {
        // TODO: we are not generating CSRF token for any other host. Are we going to?
        if (host === 'point' && !csrfTokens[host]) {
            throw new Error('No csrf token generated for this host');
        }
        const real_token = csrfTokens[host];
        if (real_token !== submittedToken) {
            // TODO: it returns 500 instead of 403
            throw new Error('Invalid csrf token submitted');
        }
    }

    _status(statusCode) {
        if (!Number.isNaN(Number(statusCode))) {
            this.status = statusCode;
        }
        return this;
    }

    _response(payload, headers = {}) {
        return {
            status: this.status,
            data: payload,
            headers: headers
        };
    }
}

module.exports = PointSDKController;
