const axios = require('axios');
const { token_address } = require('../../resources/defaultConfig.json');

const raidenBaseUrl = 'http://localhost:5001/api/v1';

const checkExistingChannel = async (serviceProviderAddress) => {
  try {
    const allUnsettledChannels = await axios.get(`${raidenBaseUrl}/channels/${token_address}`);
    const channelExists = allUnsettledChannels.data.find((_channel) => _channel.partner_address === serviceProviderAddress)
    if (channelExists) return true;
    return false;
  } catch (error) {
    console.error(error.response);
  }
};

const createChannel = async (serviceProviderAddress, totalDeposit, revealTimeout=50, settleTimeout=500) => {
  try {
    const newChannel = await axios.put(`${raidenBaseUrl}/channels`, {
      partner_address: serviceProviderAddress,
      token_address: token_address,
      total_deposit: totalDeposit,
      settle_timeout: settleTimeout,
      reveal_timeout: revealTimeout,
    })
    return newChannel;
  } catch (error) {
    console.error(error);
  }
}

const makePayment = async (serviceProviderAddress, amount) => {
  try {
    const newPayment = await axios.post(`${raidenBaseUrl}/payments/${token_address}/${serviceProviderAddress}`, {
      amount,
    })
    console.log(newPayment);
    return newPayment;
  } catch (error) {
    console.error(error);
  }
}


module.exports = {
  checkExistingChannel,
  createChannel,
  makePayment,
}
