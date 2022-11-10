import pointLogo from '../../assets/pointlogo.png';
import solanaIcon from '../../assets/solana.svg';
import rinkebyIcon from '../../assets/rinkeby.svg';

const NETWORK_ICONS = {
    mainnet: pointLogo,
    local: pointLogo,
    xnet: pointLogo,
    solana: solanaIcon,
    solana_devnet: solanaIcon,
    rinkeby: rinkebyIcon,
};

export default function WalletRow({ wallet, openReceiveModal, openSendModal }) {
    return (
        <tr key={wallet.currency_code} className="wallet-row">
            <td className="wallet-information">
                <div className="icon">
                    <img
                        alt={wallet.network}
                        src={NETWORK_ICONS[wallet.network]}
                        onError={({ currentTarget }) => {
                            currentTarget.src = pointLogo;
                        }}
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
                {isNaN(Number(wallet.balance))
                    ? wallet.balance
                    : wallet.balance.toFixed(8)}{' '}
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
