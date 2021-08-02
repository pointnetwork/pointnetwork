import React from 'react'
import { Link } from 'wouter'
import { Store, useStoreContext, ProvideStoreContext } from './Context'

const Banner = () => {
    return (
        <div className='banner clr pt--45 pb--45 mb--50'>
            <div className='container clr flex flex-column align-items-center justify-content-center'>
                <h1 className='text-center semiBold mb--50'>
                    <span className='dBlock light accentClr'>Trust in every step</span>
                    Discover, collect, and sell extraordinary NFTs
                    <span className='dBlock light large-font pt--5'>on the world's first & largest NFT marketplace</span>
                </h1>
                <form action=''>
                    <div className='search-holder clr p--5 clr whtBg'>
                        <input type='text' placeholder='Search...'/>
                        <input type='submit' className='submit'/>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StoreItem = ({ id, name, logo, description }: Store) => {
    return (
        <li className='col-md-4 col-lg-4'>
            <div className=' store item-box mb--50'>
                <div className='img-holder'>
                    <img className='img-fluid' src={ logo } alt={ `"${name}" store logo` }/>
                </div>
                <div className='pt--35 pb--35 pl--20 pr--20 text-center'>
                    <h5 className='truncate xlarge-font semiBold mb--15'>{ name }</h5>
                    <p className='medium-font light mb--25'>{ description }</p>
                    <Link href={ `/products/${ id }` } className='basic-font semiBold'>View Products</Link>
                </div>
            </div>
        </li>
    );
};

const StoreList = () => {
    const { storeList, storeListError } = useStoreContext();

    if (storeListError) {
        return <span className='error'>{ storeListError.message }</span>;
    }

    if (!storeList) {
        return <span>Loading...</span>;
    }

    if (!storeList.length) {
        return <span>No stores yet...</span>;
    }

    return (
        <div className='stores-section clr section'>
            <div className='container pb--50'>
                <div className='top clr'>
                    <h4 className='section-title '>Exclusive Stores</h4>
                </div>
                <ul className='row'>
                    { storeList.map(item => <StoreItem key={ item.id } {...item}/>) }
                </ul>
            </div>
        </div>
    );
};

export const Stores = () => (
    <ProvideStoreContext>
        <Banner/>
        <StoreList/>
    </ProvideStoreContext>
);
