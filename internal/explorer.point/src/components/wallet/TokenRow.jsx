const TokenRow = ({ token, network, openSendModal }) => {
    const decimals =
        token.decimals || token.decimals === 0 ? token.decimals : 18;

    return (
        <tr key={token.address}>
            <td>
                <strong>{token.name}</strong>
            </td>
            <td className="mono">{token.address}</td>
            <td style={{ textAlign: 'right' }}>{token.balance}</td>
            <td style={{ textAlign: 'right' }}>
                <a
                    href="#"
                    className="btn btn-sm btn-warning"
                    onClick={() =>
                        openSendModal({
                            networkType: 'eth',
                            tokenAddress: token.address,
                            network,
                            decimals,
                        })
                    }
                >
                    Send
                </a>
            </td>
        </tr>
    );
};

export default TokenRow;
