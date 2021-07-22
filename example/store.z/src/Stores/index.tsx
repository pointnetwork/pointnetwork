import React from 'react'
import { Link } from 'wouter'
import { Store, useStoreContext, ProvideStoreContext } from './Context'
import './index.css'

const StoreItem = ({ id, name, logo, description }: Store) => {
    return (
        <li className='store'>
            <Link href={ `/products/${ id }` }>
                <h3 className='name'>{ name }</h3>
                <div className='storelogo' style={{ backgroundImage: `url(${ logo })`, backgroundRepeat: 'no-repeat' }}></div>
                <span className="description">{ description }</span>
            </Link>
        </li>
    )
}

const StoreList = () => {
    const { storeList, storeListError } = useStoreContext()

    if (storeListError) {
        return <span className='error'>{ storeListError.message }</span>
    }

    if (!storeList) {
        return <span>Loading...</span>
    }

    if (!storeList.length) {
        return <span>No stores yet...</span>
    }

    return <ul>{ storeList.map(item => <StoreItem key={ item.id } {...item}/>) }</ul>
}

export const Stores = () => {
    return (
        <ProvideStoreContext>
            <StoreList/>
            <p><b>Store notifications will appear below</b></p>
            <section id="notifications"></section>
        </ProvideStoreContext>
    )
}
