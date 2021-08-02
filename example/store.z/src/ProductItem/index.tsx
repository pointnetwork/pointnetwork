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
            <li className='store'>
                <h4 className='error'>Unable to fetch product</h4>
                <span className='error'>{ fatalError.message }</span>
            </li>
        );
    }

    if (productError) {
        return (
            <li className='store'>
                <h4 className='error'>Failed to load product</h4>
                <span className='error'>{ productError.message }</span>
                <button onClick={ load }>Retry</button>
            </li>
        );
    }

    if (purchaseError) {
        return (
            <li className='store'>
                <h4 className='error'>Failed to buy product</h4>
                <span className='error'>{ purchaseError.message }</span>
                <button onClick={ buy }>Retry</button>
            </li>
        );
    }

    if (!product) {
        return <li className='store'><h4>Loading...</h4></li>;
    }

    const { image, name, description, price } = product;

    return (
        <li className='custom-col clr'>
            <div className='product clr mb--50'>
                <div className='img-holder flex align-items-center justify-content-center mb--10'>
                    <img className='img-fluid' src={ image } alt={ `"${ name }" product image`}/>
                </div>
                <h5 className='float-left medium-font medium'>
                    <span className='dBlock small-font normal accentClr pb--5'>{ name }</span>
                    { description }
                </h5>
                <div className='price small-font normal float-right'>
                    Best Price
                    <span className='dBlock medium-font medium eth'>
                        <span className='icon'>
                            <img src='assets/imgs/svg-icon/eth-icon.svg' alt=''/>
                        </span>
                        { price }
                    </span>
                </div>
                <div className='clr pb--15'></div>
                {
                    owned ? (
                        <span className='owner'>You own this!</span>
                    ) : (
                        <button type='button' className='btn sm btn-outline-primary' onClick={ buy }>Buy</button>
                    )
                }
            </div>
        </li>
    );
};

export const ProductItem = ({ data }: { data: ProductData }) => (
    <ProvideProductItemsContext data={ data }><Product/></ProvideProductItemsContext>
);
