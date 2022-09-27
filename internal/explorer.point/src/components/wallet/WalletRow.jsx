const WalletRow = ({
    wallet,
    openReceiveModal,
    openSendModal,
    walletHistory,
}) => (
    <tr key={wallet.currency_code}>
        <td>
            <strong>{wallet.currency_name}</strong> ({wallet.currency_code})
        </td>
        <td className="mono">{wallet.alias || wallet.address}</td>
        <td style={{ textAlign: 'right' }}>
            {isNaN(Number(wallet.balance))
                ? wallet.balance
                : wallet.balance.toFixed(8)}{' '}
            {wallet.currency_code}
        </td>
        <td style={{ textAlign: 'right' }}>
            <a
                href="#"
                className="btn btn-sm btn-warning"
                onClick={() =>
                    openSendModal({
                        networkType: wallet.type,
                        network: wallet.network,
                    })
                }
            >
                Send
            </a>
            &nbsp;
            <a
                href="#"
                className="btn btn-sm btn-success"
                onClick={() =>
                    openReceiveModal(wallet.currency_code, wallet.address)
                }
            >
                Receive
            </a>
            &nbsp;
            <a
                href="#"
                className="btn btn-sm btn-info"
                onClick={() => walletHistory(wallet.currency_code)}
            >
                History
            </a>
        </td>
    </tr>
);

export default WalletRow;
