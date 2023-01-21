export default function TokenRow({ token, network, openSendModal }) {
    const decimals =
        token.decimals || token.decimals === 0 ? token.decimals : 18;

    const iconFileName = token.name.toLowerCase() + '.png';

    return (
        <tr key={token.address} className="wallet-row">
            <td className="wallet-information">
                <div className="icon">
                    <img
                        alt={token.name}
                        src={'../../assets/coins/' + iconFileName}
                    />
                </div>
                <div className="data">
                    <strong>{token.name}</strong>
                    <span>{token.name}</span>
                </div>
            </td>

            <td className="wallet-address align-middle">{token.address}</td>
            <td className="align-middle" style={{ textAlign: 'right' }}>
                {token.balance}
            </td>
            <td className="wallet-actions align-middle">
                <a
                    href="#"
                    className="btn btn-sm btn-send"
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
}
