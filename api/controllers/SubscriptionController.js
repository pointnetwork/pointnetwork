const PointSDKController = require('./PointSDKController')
const Subscription = require('../../db/models/subscription');

class SubscriptionController extends PointSDKController {
  constructor(ctx, req, rep) {
    super(ctx);
    this.req = req;
    this.rep = rep;
  }

  // Returns all file metadata stored in the nodes leveldb
  async subscriptions() {
    const allSubs = await Subscription.all()
    // All subscriptions in a unique list
    var allSubsSet = [...new Set([...allSubs])];

    return this._response(allSubsSet);
  }

  async subscriptionByAddress() {
    const address = this.req.params.address;
    const sub = await Subscription.allBy('address', address)
    return this._response(sub);
  }

  async save() {
    const reqSub = this.req.body;
    const zappSubs = await Subscription.allBy('address', reqSub.address);
    let sub = Subscription.new();

    for (let i = 0; i < zappSubs.length; i++) {
      const zappSub = zappSubs[i]
      // The user is unsubscribing.
      if (zappSub.name == reqSub.name && !reqSub.isSub) {
	// Should we delete the Notification Object?
	// this.db.delete(zappSub.id);
	return this._response({});
      }
    }

    // The user is subscribing.
    sub.name = reqSub.name;
    sub.contract = reqSub.contract;
    sub.address = reqSub.address;
    sub.name = reqSub.name;
    sub.host = reqSub.host;
    sub.options = reqSub.options;
    sub.save();

    return this._response({});
  }
}

module.exports = SubscriptionController;
