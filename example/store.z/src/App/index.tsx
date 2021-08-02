import React from 'react'
import { Route } from 'wouter'
import { useAppContext, ProvideAppContext } from './Context'
import { Stores } from '~/Stores'
import { Products } from '~/Products'
import { ErrorLabel, Loader } from '~/Common'

import Categories from '~/Categories'
import HowTo from '~/HowTo'

import logo from '~/assets/imgs/logo.png';

const Header = () => {
    const { walletAddress, walletError } = useAppContext();

    return (
        <nav className='navbar navbar-expand-md '>
            <div className='container-fluid'>
                <a className='navbar-brand' href='/'>
                    <img src={ logo } alt='The Store.z Logo'/>
                </a>
                <button
                    className='navbar-toggler collapsed'
                    type='button'
                    data-bs-toggle='collapse'
                    data-bs-target='#navbarCollapse'
                    aria-controls='navbarCollapse'
                    aria-expanded='false'
                    aria-label='Toggle navigation'
                >
                    <span className='navbar-toggler-icon'></span>
                </button>
                <div className='navbar-collapse collapse ' id='navbarCollapse'>
                    <ul className='navbar-nav ms-auto mb-2 mb-md-0'>
                        <li className='nav-item'>
                            {
                                walletError ? (
                                    <ErrorLabel>Failed to load wallet address</ErrorLabel>
                                ) : walletAddress ? (
                                    <a className='nav-link active' href='#'>{ walletAddress }</a>
                                ) : (
                                    <Loader/>
                                )
                            }
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

const Footer = () => {
    return (
        <footer>
            <div className='container clr'>
                <div className='left'>
                    <p>{ `©${ new Date().getFullYear() } Store.z Copyright reserved.` }</p>
                </div>
                <div className='right'>
                    <a href='#'>About</a>
                    <a href='#'>Privacy Policy</a>
                    <a href='#'>Terms of Service</a>
                </div>
            </div>
        </footer>
    );
};

export const App = () => (
    <ProvideAppContext>
        <Header/>
        <Route path='/'><Stores/></Route>
        <Route path='/products/:storeId'><Products/></Route>
        <Categories/>
        <HowTo/>
        <Footer/>
    </ProvideAppContext>
);
