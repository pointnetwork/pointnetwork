import React from 'react';

export const Banner = () => {
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
