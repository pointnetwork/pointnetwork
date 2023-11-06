To send the native token:

await window.point.point.wallet_send({
    to,
    network: sendModalData.network,
    value,
});

To send ERC-20 tokens:

await window.point.point.wallet_send_token({
    to,
    network: sendModalData.network,
    tokenAddress: sendModalData.tokenAddress,
    value,
});
