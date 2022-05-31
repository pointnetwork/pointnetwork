import config from 'config';

class PointSDKController {
    constructor(ctx, req, web2 = false) {
        this.ctx = ctx;
        this.status = 200;

        const host = req.headers.host;
        const method = req.method.toUpperCase();

        if (method === 'POST' && config.get('api.csrf_enabled') && !web2) {
            const csrfToken = req.body.csrfToken;
            this.csrfTokenGuard(host, csrfToken);
        }
    }

    csrfTokenGuard(host, submittedToken) {
        if (!this.ctx.csrf_tokens)
            throw new Error('No csrf token generated for this host (rather, no tokens at all)');
        if (!this.ctx.csrf_tokens[host]) throw new Error('No csrf token generated for this host');
        const real_token = this.ctx.csrf_tokens[host];
        if (real_token !== submittedToken) {
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
