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

  async save() {
    const reqSubs = this.req.body;
    console.log('omega17', reqSubs);

    reqSubs.forEach(reqSub => {
      let sub = Subscription.new();
      sub.name = reqSub.name;
      sub.contract = reqSub.contract;
      sub.address = reqSub.address;
      sub.name = reqSub.name;
      sub.host = reqSub.host;
      console.log('omega44', reqSub.options)
      sub.options = reqSub.options;
      sub.save();
    });

    return this._response({});
  }
}

module.exports = SubscriptionController;
