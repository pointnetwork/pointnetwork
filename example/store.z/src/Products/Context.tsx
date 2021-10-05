import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback } from 'react'
import { useRoute } from 'wouter'
import { ProductData } from '~/@types';
import { useAppContext } from '~/App/Context';

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
    const { addSubscription } = useAppContext();

    if (params?.storeId && params.storeId !== storeId) {
        setStoreId(params.storeId)
    }

    // const subscribeToProductPurchases = useCallback(async () => {
    //     // @ts-ignore
    //     const nextProductPurchase = await window.point.contract.subscribe({
    //         contract: 'Store',
    //         event: 'ProductSoldEvent',
    //     });

    //     addSubscription(nextProductPurchase);

    //     while (true) {
    //         try {
    //             const message = await nextProductPurchase();
    //             if (!('returnValues' in message)) {
    //                 continue;
    //             }

    //             const {returnValues: {tokenId, to}} = message;

    //             setProductList((productList) => {
    //                 return productList?.map((productData: ProductData) => (
    //                    productData.productId === tokenId ? { ...productData, owner: to } : productData
    //                 ));
    //             });
    //         } catch (e) {
    //             console.error('Subscription error:', e.message, e.stack);
    //             break;
    //         }
    //     }
    // }, []);

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
                    products.map(([productId, name, price, metadata, owner]: string[]) => ({
                        storeId,
                        productId,
                        name,
                        price,
                        metadata,
                        owner,
                    } as ProductData)
                ));

                // await subscribeToProductPurchases();
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
