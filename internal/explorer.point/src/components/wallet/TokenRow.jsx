const TokenRow = ({ token, network, openSendModal }) => (
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
                        decimals: token.decimals,
                    })
                }
            >
                Send
            </a>
        </td>
    </tr>
);

export default TokenRow;
