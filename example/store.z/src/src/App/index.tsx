import React from 'react'
import assets from '../assets'

import './index.css'

const Header = () => {
    return (
        <header>
            <h1>Decentralized Store</h1>
            {/* {% set wallet_address = default_wallet_address() %} */}
            {/* <h4>Wallet Address: {{ wallet_address }}</h4> */}
            <h4>Wallet Address: { 'placeholder' }</h4>
        </header>
    )
}

const Index = () => {
    return (
        <>
            {/* {% set storeContractAddress = identity_ikv_get('store', 'zweb/contracts/address/Store') %}
            {% set storeContractAbi = storage_get_by_ikv('store', 'zweb/contracts/abi/Store') %} */}
            <p><b>Store notifications will appear below</b></p>
            <section id="notifications"></section>
            {/* <script language="JavaScript">
                // set local javascript variables from twig variables
                let storeContractAddress = "{{ storeContractAddress }}"
                let storeContractAbi = "{{ storeContractAbi }}"
                let walletAddress = "{{ wallet_address }}"
            </script>
            <script src="js/web3.min.js"></script>
            <script language="JavaScript" src="js/store.js"></script> */}
        </>
    )
}

const Main = () => {
    return (
        <main>
            <div>
                <img alt='Point Network Store' src={ assets['store-logo'] } width='400' height='122'></img>
                <p><a className='button' href='/'>Home</a></p>
                <p><b>Point Network Store Example App</b>.</p>
                <p><i>TODO: List all the available stores below</i></p>
                <Index/>
            </div>
        </main>
    )
}

export const App = () => (
    <>
        <Header/>
        <Main/>
    </>
)
