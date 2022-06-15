import Container from 'react-bootstrap/Container';
import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import ReceiveModal from '../components/wallet/ReceiveModal';
import SendModal from '../components/wallet/SendModal';
import Swal from 'sweetalert2';

window.openTelegram = () => {
    fetch('/v1/api/web2/open', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urlToOpen: 'https://t.me/pointnetwork' }),
    });
};

export default function Wallet() {
    const [wallets, setWallets] = useState([]);
    const [tokens, setTokens] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [receiveModalData, setReceiveModalData] = useState(null);
    const [sendModalData, setSendModalData] = useState(null);

    const fetchWallets = async () => {
        const response = await fetch('/v1/api/wallet/getWalletInfo');
        const walletInfo = await response.json();
        setWallets(walletInfo.data.wallets);
    };

    const fetchTokens = async () => {
        const response = await fetch('/v1/api/wallet/getTokenBalances');
        const tokensInfo = await response.json();
        setTokens(tokensInfo.data);
    };

    const fetchData = async () => {
        setIsLoading(true);
        setError(false);
        try {
            await Promise.all([fetchWallets(), fetchTokens()]);
        } catch (e) {
            console.error(e);
            setError(true);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        void fetchData();
    }, []);

    // TODO: remove this once we add real point network
    const openPlaceholderWindow = () => {
        void Swal.fire({
            icon: 'info',
            title: 'POINT token doesn\'t exist yet!',
            html: `Feel free to join <a 
                style="color: #0a58ca; cursor: pointer;" 
                onclick="window.openTelegram()">
                our Telegram group</a> to stay updated about the launch details in the future`,
        });
    };

    const send = async ({ to, value }) => {
        if (!sendModalData) return;
        if (sendModalData.tokenAddress) {
            const res = await fetch('/v1/api/wallet/sendToken', {
                method: 'POST',
                body: JSON.stringify({
                    to,
                    network: sendModalData.network,
                    tokenAddress: sendModalData.tokenAddress,
                    value,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (res.status !== 200) {
                throw new Error('Failed to send currency');
            }
        } else {
            const res = await fetch('/v1/api/wallet/send', {
                method: 'POST',
                body: JSON.stringify({
                    to,
                    network: sendModalData.network,
                    value,
                }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (res.status !== 200) {
                throw new Error('Failed to send token');
            }
        }
    };

    const openSendModal = ({
        networkType,
        network,
        tokenAddress,
        decimals,
    }) => {
        if (network === 'pointnet') {
            openPlaceholderWindow();
            return;
        }
        setSendModalData({ networkType, network, tokenAddress, decimals });
    };

    const closeSendModal = () => {
        setSendModalData(null);
    };

    const openReceiveModal = (currency, address) => {
        if (currency === 'POINT') {
            openPlaceholderWindow();
            return;
        }
        setReceiveModalData({ currency, address });
    };

    const closeReceiveModal = () => {
        setReceiveModalData(null);
    };

    function walletHistory() {
        alert('TODO');
    }

    const renderWallet = (wallet) => {
        return (
            <tr key={wallet.currency_code}>
                <td>
                    <strong>{wallet.currency_name}</strong> (
                    {wallet.currency_code})
                </td>
                <td className="mono">{wallet.address}</td>
                <td style={{ textAlign: 'right' }}>
                    {wallet.balance.toFixed(8)} {wallet.currency_code}
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
                            openReceiveModal(
                                wallet.currency_code,
                                wallet.address,
                            )
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
    };

    const renderToken = (token, network) => {
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
                                decimals: token.decimals,
                            })
                        }
                    >
                        Send
                    </a>
                </td>
            </tr>
        );
    };

    return (
        <Container className="p-3">
            {isLoading ? (
                <Loading />
            ) : error ? (
                <div>Error!</div>
            ) : (
                <>
                    {receiveModalData && (
                        <ReceiveModal
                            currency={receiveModalData.currency}
                            address={receiveModalData.address}
                            onClose={closeReceiveModal}
                        />
                    )}
                    {sendModalData && (
                        <SendModal
                            onClose={closeSendModal}
                            networkType={sendModalData.networkType}
                            onSubmit={send}
                            decimals={sendModalData.decimals}
                        />
                    )}
                    <br />
                    <h1>Wallet</h1>
                    <table className="table table-bordered table-striped table-hover table-responsive table-primary">
                        <tbody>
                            <tr>
                                <th>Currency</th>
                                <th>Address</th>
                                <th style={{ textAlign: 'right' }}>Balance</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                            {wallets.map((wallet) => renderWallet(wallet))}
                        </tbody>
                    </table>
                    <br />
                    <h1>ERC20 Tokens</h1>
                    {Object.keys(tokens).map((network) => (
                        <>
                            <h2>{network}</h2>
                            <table className="table table-bordered table-striped table-hover table-responsive table-primary">
                                <tbody>
                                    {tokens[network]?.length > 0 ? (
                                        <>
                                            <tr>
                                                <th>Token Name</th>
                                                <th>Token Address</th>
                                                <th
                                                    style={{
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    Balance
                                                </th>
                                                <th
                                                    style={{
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    Actions
                                                </th>
                                            </tr>
                                            {tokens[network]?.map((token) =>
                                                renderToken(token, network),
                                            )}
                                        </>
                                    ) : (
                                        <tr>
                                            <td>No tokens for this network</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </>
                    ))}
                </>
            )}
        </Container>
    );
}
