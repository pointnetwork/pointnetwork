import { toFixedFloor } from '../../helpers';

export default function WalletRow({ wallet, openReceiveModal, openSendModal }) {
    const balance = isNaN(Number(wallet.balance))
        ? wallet.balance
        : toFixedFloor(wallet.balance, 8);
    const integerPart = balance.split('.')[0];
    const decimalPart = balance.split('.')[1];

    return (
        <tr key={wallet.currency_code} className="wallet-row">
            <td className="wallet-information">
                <div className="icon">
                    <img
                        alt={wallet.network}
                        src={'../../assets/coins/' + wallet.icon + '.png'}
                    />
                </div>
                <div className="data">
                    <strong>{wallet.currency_name}</strong>
                    <span>{wallet.currency_code}</span>
                </div>
            </td>
            <td className="wallet-address align-middle">
                {wallet.alias || wallet.address}
            </td>
            <td className="align-middle" style={{ textAlign: 'right' }}>
                <span>{integerPart}</span>
                <span className={'text-muted'}>.{decimalPart}</span>
            </td>
            <td className="align-middle" style={{ textAlign: 'left' }}>
                {wallet.currency_code}
            </td>
            <td className="wallet-actions align-middle">
                <a
                    href="#"
                    className="btn btn-sm btn-send"
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
                    className="btn btn-sm btn-receive"
                    onClick={() =>
                        openReceiveModal(wallet.currency_code, wallet.address)
                    }
                >
                    Receive
                </a>
            </td>
        </tr>
    );
}
