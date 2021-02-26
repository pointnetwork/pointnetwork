const axios = require('axios');
const { token_address } = require('../../resources/defaultConfig.json');

const raidenBaseUrl = 'http://localhost:5001/api/v1';

const checkExistingChannel = async (serviceProviderAddress) => {
  try {
    const allUnsettledChannels = await axios.get(`${raidenBaseUrl}/channels/${token_address}`);
    return allUnsettledChannels.data.find((_channel) => {
      if (_channel.partner_address === serviceProviderAddress && _channel.state === 'opened') return true;
    });
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
    console.error(`Error in payments.createChannel: ${error.response.data.errors}`);
  }
};

const makePayment = async (serviceProviderAddress, amount) => {
  try {
    const newPayment = await axios.post(`${raidenBaseUrl}/payments/${token_address}/${serviceProviderAddress}`, {
      amount,
    })
    return newPayment;
  } catch (error) {
    console.error(`Error in payments.makePayment: ${error.response.data.errors}`);
  }
};

const checkRegisteredToken = async () => {
  try {
    const allTokens = await axios.get(`${raidenBaseUrl}/tokens`);
    return allTokens.data.find((_token) => _token === token_address);
  } catch (error) {
    console.error(error.response);
  }
};

const registerToken = async () => {
  try {
    const response = await axios.put(`${raidenBaseUrl}/tokens/${token_address}`);
    console.log(response);
    return response;
  } catch (error) {
    console.error(error.response);
  }
};


module.exports = {
  checkExistingChannel,
  createChannel,
  makePayment,
  checkRegisteredToken,
  registerToken,
};