import { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Loading from '../components/Loading';
import ReceiveModal from '../components/wallet/ReceiveModal';
import SendModal from '../components/wallet/SendModal';
import BridgeModal from '../components/wallet/BridgeModal';
import ErrorBlock from '../components/ErrorBlock';
import WalletRow from '../components/wallet/WalletRow';
import NetworkRow from '../components/wallet/NetworkRow';
import SpacingRow from '../components/wallet/SpacingRow';
import '@fontsource/source-sans-pro';
import { formatUnits } from 'ethers';

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
    const [networks, setNetworks] = useState(null);
    const [wallets, setWallets] = useState(null);
    const [addresses, setAddresses] = useState(null);
    const [balances, setBalances] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [receiveModalData, setReceiveModalData] = useState(null);
    const [sendModalData, setSendModalData] = useState(null);
    const [bridgeModalData, setBridgeModalData] = useState(null);
    const [balancesStartedUpdating, setBalancesStartedUpdating] =
        useState(false);

    const apiCall = async (url, callback) => {
        const controller = new AbortController();
        // 60 second timeout:
        setTimeout(() => controller.abort(), 60000);

        const response = await fetch(url, {
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

        const ret = await response.json();
        return ret;
    };

    const fetchNetworks = async () => {
        const data = await apiCall('/v1/api/wallet/getNetworks');
        setNetworks(data.networks);
    };

    const fetchAddresses = async () => {
        const data = await apiCall('/v1/api/wallet/getAddresses');
        setAddresses(data.addresses);
    };

    const fetchBalances = async () => {
        const data = await apiCall('/v1/api/wallet/getBalances');
        return data.balances;
    };

    const fetchData = async (wrappedFunction) => {
        try {
            // await Promise.all([wrappedFunction]);
            await wrappedFunction();
        } catch (e) {
            console.error(e);
            setError(e.message);
        }
    };

    function sendPancakeTest() {}

    useEffect(() => {
        setIsLoading(true);
        setError('');

        fetchData(fetchNetworks);
        fetchData(fetchAddresses);

        sendPancakeTest();
    }, []);

    const fetchBalanceForWallet = (key1, key2) => {
        return new Promise((resolve, reject) => {
            (async () => {
                let res;
                try {
                    const response = await window.point.wallet.balance(
                        !key2 ? key1 : key1 + '.' + key2,
                    );
                    const balance = response.data.balance;
                    const decimals = response.data.decimals;
                    res = formatUnits(balance.toString(), decimals).toString();
                } catch (e) {
                    console.error(e);
                    res = 'Error'; // todo: later, reject and handle
                }

                resolve(res);
            })();
        });
    };

    const doUpdateBalances = async (wallets) => {
        if (!wallets) return;

        if (window._balancesRequested) return;

        window._balancesRequested = true;

        Object.keys(wallets).forEach((networkName) => {
            wallets[networkName].forEach((wallet) => {
                fetchBalanceForWallet(networkName, wallet.key2)
                    .then((balance) => {
                        setBalances((prevBalances) => ({
                            ...(prevBalances || {}),
                            [networkName]: {
                                ...(prevBalances[networkName] || {}),
                                [wallet.key2]: balance,
                            },
                        }));
                    })
                    .catch((error) => {
                        console.error(
                            `Failed to fetch balance for ${networkName} ${wallet.key2}: ${error}`,
                        );
                        setBalances((prevBalances) => ({
                            ...(prevBalances || {}),
                            [networkName]: {
                                ...(prevBalances[networkName] || {}),
                                [networkName]: 'Error',
                            },
                        }));
                    });
            });
        });

        window._balancesRequested = false;
        // todo: we're not waiting for asyncs to finish, so in the future do it properly - wait for timeouts instead of piling in requests
    };

    const startUpdatingBalances = (wallets) => {
        doUpdateBalances(wallets);

        setInterval(() => {
            doUpdateBalances(wallets);
        }, 15000);
    };

    useEffect(() => {
        if (!networks) return;

        const wallets = {};
        for (const [networkName, network] of Object.entries(networks)) {
            wallets[networkName] = [];

            wallets[networkName].push({
                key1: networkName,
                key2: network.currency_code,
                currency_code: network.currency_code,
                currency_name: network.currency_name,
                network: network,
                icon: network.icon,
                type: network.type,
                address:
                    addresses && addresses[networkName]
                        ? addresses[networkName]
                        : null,
                balance:
                    balances &&
                    balances[networkName] &&
                    balances[networkName][network.currency_code]
                        ? balances[networkName][network.currency_code]
                        : null,
            });

            // load tokens
            const tokensForNetwork = network.tokens;
            if (tokensForNetwork) {
                for (const token of tokensForNetwork) {
                    const tokenWallet = {
                        key1: networkName,
                        key2: token.name,
                        currency_code: token.name,
                        currency_name: token.name,
                        network: network,
                        icon: token.icon,
                        type: 'token',
                        token: token,
                        address:
                            addresses && addresses[networkName]
                                ? addresses[networkName]
                                : null,
                        balance:
                            balances &&
                            balances[networkName] &&
                            balances[networkName][token.name]
                                ? balances[networkName][token.name]
                                : null,
                    };
                    wallets[networkName].push(tokenWallet);
                }
            }
        }
        setWallets(wallets);

        setIsLoading(false);

        if (wallets && !balancesStartedUpdating) {
            setBalancesStartedUpdating(true);
            startUpdatingBalances(wallets);
        }

        async () => {
            if (!networks) return;

            const result = await fetchBalances();
            setBalances(result);
        };
    }, [networks, balances, addresses]);

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

    const bridge = async ({
        value,
        portalAddress,
        portalTransactionType,
        portalTokenAddress,
    }) => {
        if (!bridgeModalData) return;
        if (portalTransactionType === 'native') {
            await window.point.point.wallet_send({
                to: portalAddress,
                network: bridgeModalData.networkName,
                value,
            });
        } else {
            await window.point.point.wallet_send_token({
                to: portalAddress,
                network: bridgeModalData.networkName,
                tokenAddress: portalTokenAddress,
                value,
            });
        }
    };

    const openSendModal = ({
        networkType,
        network,
        tokenAddress,
        decimals,
        balance,
    }) => {
        setSendModalData({
            networkType,
            network,
            tokenAddress,
            decimals,
            balance,
        });
    };

    const openBridgeModal = ({
        networkType,
        networkName,
        network,
        tokenAddress,
        decimals,
    }) => {
        setBridgeModalData({
            network,
            networkName,
            networkType,
            tokenAddress,
            decimals,
        });
    };

    const closeSendModal = () => {
        setSendModalData(null);
    };

    const closeBridgeModal = () => {
        setBridgeModalData(null);
    };

    const openReceiveModal = (currency, address) => {
        setReceiveModalData({ currency, address });
    };

    const closeReceiveModal = () => {
        setReceiveModalData(null);
    };

    const tbodyRows = [];
    if (wallets) {
        for (const [networkName, network_wallets] of Object.entries(wallets)) {
            tbodyRows.push(
                <SpacingRow key={networkName + 'before'} position="before" />,
            );
            tbodyRows.push(
                <NetworkRow
                    key={networkName}
                    network={network_wallets[0].network}
                />,
            );
            tbodyRows.push(
                <SpacingRow key={networkName + 'after'} position="after" />,
            );

            for (const [index, row] of network_wallets.entries()) {
                tbodyRows.push(
                    <WalletRow
                        key={row.key1 + row.key2}
                        wallet={row}
                        balances={balances}
                        networkName={networkName}
                        openReceiveModal={openReceiveModal}
                        openSendModal={openSendModal}
                        openBridgeModal={openBridgeModal}
                    />,
                );
            }
        }
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
                                balance={sendModalData.balance}
                            />
                        )}
                        {bridgeModalData && (
                            <BridgeModal
                                onClose={closeBridgeModal}
                                network={bridgeModalData.network}
                                networkName={bridgeModalData.networkName}
                                networkType={bridgeModalData.networkType}
                                onSubmit={bridge}
                                decimals={bridgeModalData.decimals}
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
                                    <th>&nbsp;</th>
                                    <th
                                        style={{
                                            textAlign: 'right',
                                            paddingRight: '15px',
                                        }}
                                    >
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>{tbodyRows}</tbody>
                        </Table>
                    </>
                )}
            </Container>
        </>
    );
}
