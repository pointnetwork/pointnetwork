import React from 'react'
import assets from '~/assets'
import { Route } from 'wouter'
import { useAppContext, ProvideAppContext } from './Context'
import { Stores } from '~/Stores'
import { Products } from '~/Products'

import './index.css'

const Header = () => {
    const { walletAddress } = useAppContext()

    return (
        <header>
            <h1>Decentralized Store</h1>
            <h4>Wallet Address: { walletAddress || 'Loading...' }</h4>
        </header>
    )
}

const Main = () => {
    return (
        <main>
            <div>
                <img alt='Point Network Store' src={ assets['store-logo'] } width='400' height='122'></img>
                <p><a className='button' href='/'>Home</a></p>
                <p><b>Point Network Store Example App</b>.</p>
                <Route path='/'><Stores/></Route>
                <Route path='/products/:store'><Products/></Route>
            </div>
        </main>
    )
}

export const App = () => <ProvideAppContext><Header/><Main/></ProvideAppContext>
