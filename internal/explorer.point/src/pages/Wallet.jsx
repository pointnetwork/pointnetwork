import Container from "react-bootstrap/Container";
import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import ReceiveModal from "../components/wallet/ReceiveModal";

window.openTelegram = () => {
    fetch("/v1/api/web2/open", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ urlToOpen: "https://t.me/pointnetwork" }),
    });
};

export default function Wallet() {
    const [wallets, setWallets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [receiveModalData, setReceiveModalData] = useState(null);

    useEffect(() => {
        void fetchWallets();
    }, []);

    const fetchWallets = async () => {
        setIsLoading(true);
        const response = await fetch("/v1/api/wallet/getWalletInfo");
        const walletInfo = await response.json();
        setWallets(walletInfo.data.wallets);
        setIsLoading(false);
    };

    function walletSend(code) {
        alert("TODO");
    }

    const openReceiveModal = (currency, address) => {
        setReceiveModalData({ currency, address });
    };

    const closeReceiveModal = () => {
        setReceiveModalData(null);
    };

    function walletHistory(code) {
        alert("TODO");
    }

    const renderWallet = (wallet) => {
        return (
            <tr key={wallet.currency_code}>
                <td>
                    <strong>{wallet.currency_name}</strong> (
                    {wallet.currency_code})
                </td>
                <td className="mono">{wallet.address}</td>
                <td style={{ textAlign: "right" }}>
                    {wallet.balance.toFixed(8)} {wallet.currency_code}
                </td>
                <td style={{ textAlign: "right" }}>
                    <a
                        href="#"
                        className="btn btn-sm btn-warning"
                        onClick={() => walletSend(wallet.currency_code)}
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

    return (
        <Container className="p-3">
            {receiveModalData && (
                <ReceiveModal
                    currency={receiveModalData.currency}
                    address={receiveModalData.address}
                    onClose={closeReceiveModal}
                />
            )}
            <br />
            <h1>Wallet</h1>
            <table className="table table-bordered table-striped table-hover table-responsive table-primary">
                <tbody>
                <tr>
                    <th>Currency</th>
                    <th>Address</th>
                    <th style={{ textAlign: "right" }}>Balance</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
                {isLoading
                    ? null
                    : wallets.map((wallet) => renderWallet(wallet))}
                </tbody>
            </table>
            {isLoading ? <Loading /> : null}
        </Container>
    );
}
