const config = require('config');

class WPOINTController extends PointSDKController {
  constructor(req, reply) {
    super(req);
    this.req = req;
    this.payload = req.body;
    this.reply = reply;
  }

  async subscribe() {
    // const web3 = new Web3();
    const subscriptionContract = await ethereum.loadPointContract('Subscription', SUBSCRIPTION_CONTRACT_ADDRESS);
    const from = '0x84fff972B0b6B1E59eEc0913e68148d2A947A716';
    const to = '0x8D34d2f5634fAB75798F1aB81007c7EEb2B6D1b2';
    const tokenAddress = '0x1D96d04A5C52De34E6Df8A7B7F06FA0ea16e3D9F';
    const tokenAmount = '1';
    const periodSeconds = '10';
    const gasPrice = '10';

    // contract.methods.executeSubscription(
    //   '0x84fff972B0b6B1E59eEc0913e68148d2A947A716',
    //   '0x8D34d2f5634fAB75798F1aB81007c7EEb2B6D1b2',
    //   '0x1938A66771bf34788Ec1Abe1fE49288B6bBf3CAf',
    //   '1',
    //   '10',
    //   '10',
    //   '0xd35e778c74dd552027b564afd429103f7b60a2258ca70d70ec595112e871fcd354ad6171cd342869c2344af018b27d49f42380e489d87deb930b4790e97ac7e81b'
    // ).call({from: '0x84fff972B0b6B1E59eEc0913e68148d2A947A716'}).then(console.log);

    const method = subscriptionContract.methods.getSubscriptionHash(
      from,
      to,
      tokenAddress, tokenAmount, periodSeconds, gasPrice);
    console.log('meow', await method.call());
    // keccak256();
    // TODO Maybe remove keccak from imports.
  }
}

module.exports = WPOINTController;
