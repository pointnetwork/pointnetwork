import pointLogo from '../../assets/pointlogo.png';
import usdcIcon from '../../assets/usdc.svg';
import usdtIcon from '../../assets/usdt.svg';
import daiIcon from '../../assets/dai.svg';

const TOKEN_ICONS = {
    'USDC': usdcIcon,
    'USDT': usdtIcon,
    'DAI': daiIcon,
};

const TOKEN_NAMES = {
    'USDC': "USD Coin",
    'USDT': "Tether",
    'DAI': "Dai",
};

export default function TokenRow({ token, network, openSendModal }) {
    const decimals = token.decimals || token.decimals === 0 ? token.decimals : 18;

    return (
        <tr key={token.address} className="wallet-row">
            <td className="wallet-information">
                <div className="icon">
                    <img
                        alt={token.name}
                        src={TOKEN_ICONS[token.name]}
                        onError={({ currentTarget }) => {
                            currentTarget.src = pointLogo;
                        }}
                    />
                </div>
                <div className="data">
                    <strong>{TOKEN_NAMES[token.name]}</strong>
                    <span>{token.name}</span>
                </div>
            </td>

            <td className="wallet-address align-middle">{token.address}</td>
            <td className="align-middle" style={{ textAlign: 'right' }}>{token.balance}</td>
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
};
