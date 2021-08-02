import React from 'react'
import { ProvideProductsContext, useProductsContext } from './Context'
import { ProductItem } from '~/ProductItem';

const ProductList = () => {
    const { storeId, productList, productListError } = useProductsContext();

    if (productListError) {
        return <span className='error'>{ productListError.message }</span>;
    }

    if (!storeId || !productList) {
        return <span>Loading...</span>;
    }

    if (!productList.length) {
        return <span>No products yet...</span>;
    }

    return (
        <div className='products-section clr section'>
            <div className='container pb--50'>
                <div className='top clr'>
                    <a href='#' className='float-right link'>View All Products</a>
                    <h4 className='section-title '>Popular Products</h4>
                </div>
                <ul className='row'>
                    { productList.map((data)=> <ProductItem key={ data.productId } data={ data }/>)}
                </ul>
            </div>
        </div>
    );
};

export const Products = () => <ProvideProductsContext><ProductList/></ProvideProductsContext>
