import React from 'react';
import { ProductData } from '~/@types';
import { useProductItemContext, ProvideProductItemsContext } from './Context';

const Product = () => {
    const {
        owned,
        product,
        fatalError,
        productError,
        purchaseError,
        buy,
        load,
    } = useProductItemContext();

    if (fatalError) {
        return (
            <li className="store">
                <h4 className='error'>Unable to fetch product</h4>
                <span className='error'>{ fatalError.message }</span>
            </li>
        );
    }

    if (productError) {
        return (
            <li className="store">
                <h4 className='error'>Failed to load product</h4>
                <span className='error'>{ productError.message }</span>
                <button onClick={ load }>Retry</button>
            </li>
        );
    }

    if (purchaseError) {
        return (
            <li className="store">
                <h4 className='error'>Failed to buy product</h4>
                <span className='error'>{ purchaseError.message }</span>
                <button onClick={ buy }>Retry</button>
            </li>
        );
    }

    if (!product) {
        return <li className="store"><h4>Loading...</h4></li>
    }

    const { name, description, price } = product;

    return (
        <li className="store">
            <h3 className="name">{ name }</h3>
            <p className="description">{ description }</p>
            <span className="price">Price: { price }</span>
            { owned ? <span className='owner'>You own this!</span> : <button onClick={ buy }>Buy</button> }
        </li>
    )
}

export const ProductItem = ({ data }: { data: ProductData }) => (
    <ProvideProductItemsContext data={ data }><Product/></ProvideProductItemsContext>
);
