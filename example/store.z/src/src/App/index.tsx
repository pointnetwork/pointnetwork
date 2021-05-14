import React from 'react'
import assets from '../assets'
import { useAppContext, ProvideAppContext, Store } from './Context'

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

const StoreItem = ({ id, name, logo, description }: Store) => {
    return (
        <div className='store'>
            <h3 className='name'>{ name }</h3>
            <div id='storelogo' style={{ backgroundImage: `url(${ logo })`, backgroundRepeat: 'no-repeat' }}></div>
            <i className="description">{ description }</i>
            <p><a href={ `/products?storeId=${ id }` }>View { name } Products</a></p>
            <hr />
        </div>
    )
}

const StoreList = () => {
    const { storeList } = useAppContext()

    if (!storeList.length) {
        return <p>Loading...</p>
    }

    return <>{ storeList.map(item => <StoreItem key={ item.id } {...item}/>) }</>
}

const Index = () => {
    return (
        <>
            <StoreList/>
            <p><b>Store notifications will appear below</b></p>
            <section id="notifications"></section>
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
                <Index/>
            </div>
        </main>
    )
}

export const App = () => (
    <ProvideAppContext>
        <Header/>
        <Main/>
    </ProvideAppContext>
)
