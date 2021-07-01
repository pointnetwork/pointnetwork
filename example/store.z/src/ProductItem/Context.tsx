import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback } from 'react'
import { Product, ProductData } from '~/@types';
import { useAppContext } from '~/App/Context';

const defaultContext = {
    owned: false,
    product: undefined as Product | undefined,
    fatalError: undefined as Error | undefined,
    productError: undefined as Error | undefined,
    purchaseError: undefined as Error | undefined,
    load: () => {},
    buy: () => {},
};

const ProductItemContext = createContext(defaultContext)

export const useProductItemContext = () => useContext(ProductItemContext)
export const ProvideProductItemsContext = ({ data, children }: { data: ProductData, children: ReactNode }) => {
    const { walletAddress } = useAppContext();
    const [product, setProduct] = useState<Product | undefined>();
    const [fatalError, setFatalError] = useState<Error | undefined>();
    const [productError, setProductError] = useState<Error | undefined>();
    const [purchaseError, setPurchaseError] = useState<Error | undefined>();

    const load = useCallback(async () => {
        if (!data) {
            setFatalError(new Error('Invalid product data'));
            return;
        }

        const { productId, owner, metadata } = data;

        try {
            // @ts-ignore
            const response = await window.point.storage.get({ id: metadata, encoding: 'utf-8' });
            const { data: product } = response;

            if (!product) {
                console.error('Incorrect product response:', response);
                throw new Error(`Incorrect product data for product id: ${ productId }`);
            }

            const { name, description, price } = JSON.parse(product);

            setProduct({ productId, name, description, price, owner });
        } catch (e) {
            console.error('Failed to load product:', data, e);
            setProductError(e);
        }
    }, [data]);

    const buy = useCallback(async () => {
        if (!product) {
            return;
        }

        const { productId, price } = product;
        console.info(`Selected to purchase product ${ productId } at price ${ price }`);

        try {
            // @ts-ignore
            await window.point.contract.send({
                contract: 'Store',
                method: 'buyProductSimple',
                params: [productId, price]
            });

            // TODO: handle purchase

            load(); // reload the product in order to capture the owner change

        } catch (e) {
            console.error('Failed to buy product', productId, e);
            setPurchaseError(e);
        }
    }, [product]);

    useEffect(() => void load(), [data]);

    const context = {
        owned: product ? product.owner === walletAddress : false,
        product,
        fatalError,
        productError,
        purchaseError,
        load,
        buy,
    };

    return <ProductItemContext.Provider value={ context }>{ children }</ProductItemContext.Provider>
}
