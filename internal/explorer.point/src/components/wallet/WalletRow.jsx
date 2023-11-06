import { toFixedFloor } from '../../helpers';

export default function WalletRow({
    wallet,
    networkName,
    openReceiveModal,
    openSendModal,
    openBridgeModal,
}) {
    let balance = wallet.balance ? wallet.balance : null;
    let integerPart = balance;
    let decimalPart = '';
    if (
        !isNaN(Number(wallet.balance)) &&
        wallet.balance !== null &&
        typeof wallet.balance !== 'undefined'
    ) {
        balance = toFixedFloor(wallet.balance, 8);
        integerPart = balance.split('.')[0];
        decimalPart = balance.split('.')[1];
    }

    const canBridge =
        (wallet.key1 === 'point' && wallet.key2 === 'POINT') ||
        (wallet.key1 === 'bsc' && wallet.key2 === 'POINT');

    const onClickHandler = (e) => {
        if (wallet.type === 'eth') {
            openSendModal({
                networkType: wallet.type,
                network: networkName,
            });
        } else if (wallet.type === 'token') {
            openSendModal({
                networkType: 'ethtoken',
                tokenAddress: wallet.token.address,
                tokenName: wallet.token.name,
                symbol: wallet.token.symbol,
                network: networkName,
                decimals: wallet.token.decimals,
            });
        } else {
            throw new Error('Invalid wallet type');
        }
    };

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
                    onClick={(e) => {
                        e.preventDefault();
                        onClickHandler();
                    }}
                >
                    Send
                </a>
                &nbsp;
                <a
                    href="#"
                    className="btn btn-sm btn-receive"
                    onClick={(e) => {
                        e.preventDefault();
                        openReceiveModal(wallet.currency_code, wallet.address);
                    }}
                >
                    Receive
                </a>
                &nbsp;
                <a
                    href="#"
                    className="btn btn-sm btn-bridge"
                    style={{ visibility: canBridge ? 'visible' : 'hidden' }}
                    onClick={(e) => {
                        e.preventDefault();
                        openBridgeModal({
                            networkType: wallet.type,
                            networkName: networkName,
                            network: wallet.network,
                        });
                    }}
                >
                    Bridge
                </a>
            </td>
        </tr>
    );
}
