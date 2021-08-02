import React from 'react'
import { ProvideProductsContext, useProductsContext } from './Context'
import { ProductItem } from '~/Product';
import { ErrorLabel, Label, Loader } from '~/Common';

const ProductList = () => {
    const { storeId, productList, productListError } = useProductsContext();

    if (productListError) {
        return <ErrorLabel>{ productListError.message }</ErrorLabel>;
    }

    if (!storeId || !productList) {
        return <Loader/>;
    }

    if (!productList.length) {
        return <Label>No products yet...</Label>;
    }

    return (
        <ul className='row'>
            { productList.map((data)=> <ProductItem key={ data.productId } data={ data }/>)}
        </ul>
    );
};

export const Products = () => (
    <ProvideProductsContext>
        <div className='products-section clr section'>
            <div className='container pb--50'>
                <div className='top clr'>
                    <a href='#' className='float-right link'>View All Products</a>
                    <h4 className='section-title '>Popular Products</h4>
                </div>
                <ProductList/>
            </div>
        </div>
    </ProvideProductsContext>
);
