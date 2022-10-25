import { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Loading from '../components/Loading';
import ReceiveModal from '../components/wallet/ReceiveModal';
import SendModal from '../components/wallet/SendModal';
import ErrorBlock from '../components/ErrorBlock';
import WalletRow from '../components/wallet/WalletRow';
import TokenRow from '../components/wallet/TokenRow';
import '@fontsource/source-sans-pro';

window.openTelegram = async () => {
    fetch('/v1/api/web2/open', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
        },
        body: JSON.stringify({
            urlToOpen: 'https://t.me/pointnetwork',
            _csrf: localStorage.getItem('csrf_token'),
        }),
    });
};

export default function Wallet() {
    const [wallets, setWallets] = useState([]);
    const [tokens, setTokens] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [receiveModalData, setReceiveModalData] = useState(null);
    const [sendModalData, setSendModalData] = useState(null);

    const fetchWallets = async () => {
        const controller = new AbortController();
        // 60 second timeout:
        setTimeout(() => controller.abort(), 60000);

        const response = await fetch('/v1/api/wallet/getWalletInfo', {
            signal: controller.signal,
            headers: {
                'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
            },
        });
        if (!response.ok) {
            throw new Error(
                `Unable to fetch wallet info. Error code: ${response.status}.`,
            );
        }

        const walletInfo = await response.json();
        setWallets(walletInfo.data.wallets);
    };

    const fetchTokens = async () => {
        const controller = new AbortController();
        // 10 second timeout:
        setTimeout(() => controller.abort(), 60000);

        const response = await fetch('/v1/api/wallet/getTokenBalances', {
            signal: controller.signal,
            headers: {
                'X-Point-Token': `Bearer ${await window.point.point.get_auth_token()}`,
            },
        });
        if (!response.ok) {
            throw new Error(
                `Unable to fetch token balances. Error code: ${response.status}.`,
            );
        }

        const tokensInfo = await response.json();
        setTokens(tokensInfo.data);
    };

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            await Promise.all([fetchWallets(), fetchTokens()]);
        } catch (e) {
            console.error(e);
            setError(e.message);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        void fetchData();
    }, []);

    const send = async ({ to, value }) => {
        if (!sendModalData) return;
        if (sendModalData.tokenAddress) {
            await window.point.point.wallet_send_token({
                to,
                network: sendModalData.network,
                tokenAddress: sendModalData.tokenAddress,
                value,
            });
        } else {
            await window.point.point.wallet_send({
                to,
                network: sendModalData.network,
                value,
            });
        }
    };

    const openSendModal = ({
        networkType,
        network,
        tokenAddress,
        decimals,
    }) => {
        setSendModalData({ networkType, network, tokenAddress, decimals });
    };

    const closeSendModal = () => {
        setSendModalData(null);
    };

    const openReceiveModal = (currency, address) => {
        setReceiveModalData({ currency, address });
    };

    const closeReceiveModal = () => {
        setReceiveModalData(null);
    };

    function walletHistory() {
        alert('TODO');
    }

    return (
        <>
            <div className="warning-banner">
                <b>Warning:</b> This is experimental software. Please do not
                fund Point Wallet with large amount of assets, only for
                experiments.
            </div>
            <Container className="p-3 wallet-container">
                {isLoading ? (
                    <Loading />
                ) : error ? (
                    <ErrorBlock
                        title="Sorry, something went wrong fetching the wallet data."
                        details={error}
                    />
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
                        <h1 className="wallet-header">Wallet</h1>
                        <Table responsive>
                            <thead>
                                <tr>
                                    <th>Currency</th>
                                    <th>Address</th>
                                    <th style={{ textAlign: 'right' }}>
                                        Balance
                                    </th>
                                    <th style={{ textAlign: 'right', paddingRight: '15px' }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {wallets.map((wallet, index) => (
                                    <WalletRow
                                        key={index}
                                        wallet={wallet}
                                        openReceiveModal={openReceiveModal}
                                        openSendModal={openSendModal}
                                        walletHistory={walletHistory}
                                    />
                                ))}
                            </tbody>
                        </Table>
                        <br />
                        <h1 className="wallet-header">ERC20 Tokens</h1>
                        <Tabs className="wallet-tabs">
                            {Object.keys(tokens).map((network, index) => (
                                <Tab key={index} eventKey={network} title={network}>
                                    {tokens[network]?.length > 0 ? (
                                        <Table responsive>
                                            <thead>
                                                <tr>
                                                    <th>Token Name</th>
                                                    <th>Token Address</th>
                                                    <th style={{ textAlign: 'right' }}>
                                                        Balance
                                                    </th>
                                                    <th style={{ textAlign: 'right', paddingRight: '15px' }}>
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tokens[network]?.map((token, index) => (
                                                    <TokenRow
                                                        token={token}
                                                        key={index}
                                                        openSendModal={
                                                            openSendModal
                                                        }
                                                        network={network}
                                                    />
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <p className="wallet-no-tokens">No tokens for this network</p>
                                    )}
                                </Tab>
                            ))}
                        </Tabs>
                    </>
                )}
            </Container>
        </>
    );
}
