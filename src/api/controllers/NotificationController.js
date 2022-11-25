const config = require('config');
const PointSDKController = require('./PointSDKController');
const {default: notifications} = require('../../notifications/notifications');
const ethereum = require('../../network/providers/ethereum');

const GET_LOGS_BLOCK_RANGE = config.get('network.get_logs_block_range');

class NotificationController extends PointSDKController {
    constructor(req, reply) {
        super(req);
        this.req = req;
        this.host = this.req.headers.host;
        this.payload = req.body;
        this.reply = reply;
    }

    async getUnreadNotifications() {
        try {
            const unread = await notifications.loadUnread();
            return this._status(200)._response(unread);
        } catch (err) {
            this.reply.status(500);
            return this._status(500)._response(err.message ?? 'Unable to get unread notifications from database');
        }
    }

    async scanEventLogs() {
        try {
            let from;
            let to;
            let latest;

            if (!Number.isNaN(Number(this.req.query.from))) {
                from = Number(this.req.query.from);
            }
            if (!Number.isNaN(Number(this.req.query.to))) {
                to = Number(this.req.query.to);
            }
            if (from && !to) {
                to = from + GET_LOGS_BLOCK_RANGE;
            }
            if (!from) {
                const blocks = await notifications.getBlockRange();
                from = blocks.from;
                to = blocks.to;
            }

            if (!Number.isNaN(Number(this.req.query.latest))) {
                latest = Number(this.req.query.latest);
            } else {
                latest = await ethereum.getBlockNumber();
            }
            if (to > latest) {
                to = latest;
            }

            const logs = await notifications.loadUserSubscriptionsAndGetLogs(from, to);
            return this._status(200)._response({from, to, latest, logs});
        } catch (err) {
            this.reply.status(500);
            return this._status(500)._response(err.message ?? 'Unable to get event logs');
        }
    }

    async markRead() {
        try {
            const {id} = this.req.params;
            if (!id || Number.isNaN(Number(id))) {
                this.reply.status(400);
                return this._status(400)._response(`Invalid notificaiton id "${id}"`);
            }
            const affected = await notifications.markRead(id);
            if (affected === 0) {
                this.reply.status(404);
                return this._status(404)._response(`Notificaiton #"${id}" not found`);
            }
            return this._status(200)._response(`Marked notification #${id} as read`);
        } catch (err) {
            this.reply.status(500);
            return this._status(500)._response(err.message ?? 'Error marking notification as read');
        }
    }
}

module.exports = NotificationController;
