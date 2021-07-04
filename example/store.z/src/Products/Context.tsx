import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback } from 'react'
import { useRoute } from 'wouter'
import { ProductData } from '~/@types';

export type ProductsRouteParams = {
     storeId: string
};

const defaultContext = {
    storeId: undefined as string | undefined,
    productList: undefined as ProductData[] | undefined,
    productListError: undefined as Error | undefined,
};

const ProductsContext = createContext(defaultContext)

export const useProductsContext = () => useContext(ProductsContext)
export const ProvideProductsContext = ({ children }: { children: ReactNode }) => {
    const [storeId, setStoreId] = useState<string>();
    const [productList, setProductList] = useState<ProductData[] | undefined>();
    const [productListError, setProductListError] = useState<Error | undefined>();
    const [, params] = useRoute<ProductsRouteParams>('/products/:storeId');

    if (params?.storeId && params.storeId !== storeId) {
        setStoreId(params.storeId)
    }

    useEffect(() => {
        if (!storeId) {
            return
        }

        (async () => {
            try {
                // @ts-ignore
                const response = await window.point.contract.call({
                    contract: 'Store',
                    method: 'getProductsByStoreId',
                    params: [parseInt(storeId)]
                });

                const { data: products } = response;

                if (!Array.isArray(products)) {
                    console.error('Incorrect getProductsByStoreId response:', response);
                    throw new Error('Incorrect products data');
                }

                setProductList(
                    products.map(([id, productId, name, price, metadata, metadataHash, owner]: string[]) => ({
                        storeId,
                        id,
                        productId,
                        name,
                        price,
                        metadata,
                        metadataHash,
                        owner,
                    } as ProductData)
                ));
            } catch (e) {
                setProductListError(e);
            }
        })();
    }, [storeId])

    const context = {
        storeId,
        productList,
        productListError,
    }

    return <ProductsContext.Provider value={ context }>{ children }</ProductsContext.Provider>
}
