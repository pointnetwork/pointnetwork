import Container from 'react-bootstrap/Container';
import { useEffect, useState } from "react";
import $ from 'jquery';
import Swal from 'sweetalert2';
import Loading from '../components/Loading';

window.openTelegram = () => {
    fetch('/v1/api/web2/open', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({urlToOpen: 'https://t.me/pointnetwork'})
    });
}

export default function Wallet() {

    const [wallets, setWallets] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(()=>{
        fetchWallets();
    },[])

    const fetchWallets = async () => {
        setIsLoading(true);
        const response = await fetch('/v1/api/wallet/getWalletInfo');
        const walletInfo = await response.json();
        setWallets(walletInfo.data.wallets);
        setIsLoading(false);
        
    }

    function pointMessage() {
        Swal.fire({
            icon: 'info',
            title: 'POINT token doesn\'t exist yet!',
            html: 'Feel free to join <a href="javascript:window.openTelegram()">our Telegram group</a> to stay updated about the launch details in the future',
        })
    }

    function walletSend(code) {
        if (code === 'POINT') return pointMessage();
    }

    function walletReceive(code, address) {
        if (code === 'POINT') return pointMessage();
    }

    function walletHistory(code) {
        if (code === 'POINT') return pointMessage();
        // location.href = '/wallet/history/' + code;
    }

    const renderWallet = (wallet) => {
        return(
            <tr key={wallet.currency_code}>
                <td><strong>{wallet.currency_name}</strong> ({wallet.currency_code })</td>
                <td className="mono">{wallet.address}</td>
                <td style={{textAlign: 'right'}}>{ wallet.balance.toFixed(8) } { wallet.currency_code }</td>
                <td style={{textAlign: 'right'}}>
                    <a href="#" className="btn btn-sm btn-warning" onClick={() => walletSend( wallet.currency_code )}>Send</a>&nbsp;
                    <a href="#" className="btn btn-sm btn-success" onClick={() => walletReceive( wallet.currency_code, wallet.address )}>Receive</a>&nbsp;
                    <a href="#" className="btn btn-sm btn-info" onClick={() => walletHistory( wallet.currency_code )}>History</a>
                </td>
            </tr>
        )
    }

    return(
        <Container className="p-3">
            <br/>
            <h1>Wallet</h1>
            <table className="table table-bordered table-striped table-hover table-responsive table-primary">
                <tbody>
                    <tr>
                        <th>Currency</th>
                        <th>Address</th>
                        <th style={{textAlign: 'right'}}>Balance</th>
                        <th style={{textAlign: 'right'}}>Actions</th>
                    </tr>
                    {isLoading ? null : wallets.map((wallet) => renderWallet(wallet))}
                </tbody>
            </table>
            {isLoading ? <Loading/> : null}
        </Container>
    )


}
