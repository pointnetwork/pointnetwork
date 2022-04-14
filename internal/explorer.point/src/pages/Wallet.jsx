import Container from 'react-bootstrap/Container';
import { useEffect, useState } from "react";
import $ from 'jquery';
import Swal from 'sweetalert2';

export default function Wallet() {

    const [wallets, setWallets] = useState([])

    useEffect(()=>{
        fetchWallets();
    },[])

    const fetchWallets = async () => {
        const response = await fetch('/v1/api/wallet/getWalletInfo');
        const walletInfo = await response.json();
        console.log(walletInfo);
        setWallets(walletInfo.data.wallets);
        
    }

    function pointMessage() {
        Swal.fire({
            icon: 'info',
            title: 'POINT token doesn\'t exist yet!',
            text: 'Feel free to join our Telegram group to stay updated about the launch details in the future',
            // footer: '<a href="">Why do I have this issue?</a>'
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
            <tr>
                <td><strong>{wallet.currency_name}</strong> ({wallet.currency_code })</td>
                <td className="mono">{wallet.address}</td>
                <td style={{'text-align': 'right'}}>{ wallet.balance.toFixed(8) } { wallet.currency_code }</td>
                <td style={{'text-align': 'right'}}>
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
                        <th style={{'text-align': 'right'}}>Balance</th>
                        <th style={{'text-align': 'right'}}>Actions</th>
                    </tr>
                    {wallets.map((wallet) => renderWallet(wallet))}
                </tbody>
            </table>
        </Container>
    )


}
