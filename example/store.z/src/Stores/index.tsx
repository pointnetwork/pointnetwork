import React from 'react';
import { Link } from 'wouter';
import { Store, useStoreContext, ProvideStoreContext } from './Context';
import { Banner } from '~/Banner';
import { ErrorLabel, Label, Loader } from '~/Common';

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
        return <ErrorLabel>{ storeListError.message }</ErrorLabel>;
    }

    if (!storeList) {
        return <Loader/>;
    }

    if (!storeList.length) {
        return <Label>No stores yet...</Label>;
    }

    return (
        <ul className='row'>
            { storeList.map(item => <StoreItem key={ item.id } {...item}/>) }
        </ul>
    );
};

export const Stores = () => (
    <ProvideStoreContext>
        <Banner/>
        <div className='stores-section clr section'>
            <div className='container pb--50'>
                <div className='top clr'>
                    <h4 className='section-title '>Exclusive Stores</h4>
                    <StoreList/>
                </div>
            </div>
        </div>
    </ProvideStoreContext>
);
