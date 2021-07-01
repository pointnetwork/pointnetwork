import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import { useRoute } from 'wouter'

export type Product = {
  storeId: string,
  productId: string,
  name: string,
  description: string,
  price: string,
  owner: string
};

export type ProductsRouteParams = {
  storeId: string
};

const defaultContext = {
  storeId: undefined as string | undefined,
  productList: undefined as Product[] | undefined,
  productListError: undefined as Error | undefined
};

const ProductsContext = createContext(defaultContext)

export const useProductsContext = () => useContext(ProductsContext)
export const ProvideProductsContext = ({ children }: { children: ReactNode }) => {
  const [storeId, setStoreId] = useState<string>();
  const [productList, setProductList] = useState<Product[] | undefined>();
  const [productListError, setProductListError] = useState<Error | undefined>();
  const [, params] = useRoute<ProductsRouteParams>('/products/:store');

  if (params?.storeId && params.storeId !== storeId) {
    setStoreId(params.storeId)
  }

  useEffect(() => {
    console.info({storeId});
    if (!storeId) {
      return
    }

    (async () => {
      try {
        // @ts-ignore
        const response = await window.point.contract.call({
          contract: 'Store',
          method: 'getProductsByStoreIdSimple',
          params: [parseInt(storeId)]
        });
        const {data: products} = response;

        console.info({products})

        if (!Array.isArray(products)) {
          console.error('Incorrect getProductsByStoreIdSimple response:', response);
          throw new Error('Incorrect products data');
        }

        setProductList(products.map(([_id, productId, name, price, _metadata, metadataHash, owner]: string[]) => {
          // @ts-ignore
          // TODO: fetch product data first:
          // const productData = JSON.parse(await window.point.storage.getById(metadata));

          return { storeId, productId, name, description: metadataHash, price, owner };
        }) as Product[]);
      } catch (e) {
        setProductListError(e);
      }
    })()
  }, [storeId])

  const context = {
    storeId,
    productList,
    productListError,
  }

  return <ProductsContext.Provider value={ context }>{ children }</ProductsContext.Provider>
}
