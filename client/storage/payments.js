const axios = require('axios');
const {token_address} = require('../../resources/defaultConfig.json');

const raidenBaseUrl = 'http://localhost:5001/api/v1';

const checkExistingChannel = async serviceProviderAddress => {
    const allUnsettledChannels = await axios.get(`${raidenBaseUrl}/channels/${token_address}`);
    return allUnsettledChannels.data.find(_channel => {
        if (_channel.partner_address === serviceProviderAddress && _channel.state === 'opened')
            return true;
    });
};

const createChannel = async (
    serviceProviderAddress,
    totalDeposit,
    revealTimeout = 50,
    settleTimeout = 500
) => {
    const newChannel = await axios.put(`${raidenBaseUrl}/channels`, {
        partner_address: serviceProviderAddress,
        token_address: token_address,
        total_deposit: totalDeposit,
        settle_timeout: settleTimeout,
        reveal_timeout: revealTimeout
    });
    return newChannel;
};

const makePayment = async (serviceProviderAddress, amount) => {
    const newPayment = await axios.post(
        `${raidenBaseUrl}/payments/${token_address}/${serviceProviderAddress}`,
        {amount}
    );
    return newPayment;
};

const checkRegisteredToken = async () => {
    const allTokens = await axios.get(`${raidenBaseUrl}/tokens`);
    return allTokens.data.find(_token => _token === token_address);
};

const registerToken = async () => {
    const response = await axios.put(`${raidenBaseUrl}/tokens/${token_address}`);
    return response;
};

module.exports = {
    checkExistingChannel,
    createChannel,
    makePayment,
    checkRegisteredToken,
    registerToken
};
