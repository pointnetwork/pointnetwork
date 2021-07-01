import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback } from 'react'
import { useRoute } from 'wouter'

export type Product = {
  storeId: string,
  productId: string,
  name: string,
  description: string,
  price: string,
  owner: string,
};

export type ProductsRouteParams = {
  storeId: string
};

const defaultContext = {
  storeId: undefined as string | undefined,
  productList: undefined as Product[] | undefined,
  productListError: undefined as Error | undefined,
  buyProduct: (productId:string, price:string) => {},
};

const ProductsContext = createContext(defaultContext)

export const useProductsContext = () => useContext(ProductsContext)
export const ProvideProductsContext = ({ children }: { children: ReactNode }) => {
  const [storeId, setStoreId] = useState<string>();
  const [productList, setProductList] = useState<Product[] | undefined>();
  const [productListError, setProductListError] = useState<Error | undefined>();
  const [, params] = useRoute<ProductsRouteParams>('/products/:storeId');

  if (params?.storeId && params.storeId !== storeId) {
    setStoreId(params.storeId)
  }

  const buyProduct = useCallback(async (productId:string, price:string) => {
    console.info(`Selected to purchase product tokenId: ${productId} with price: ${price}`)
    try {
      // @ts-ignore
      await window.point.contract.send({
        contract: 'Store',
        method: 'buyProductSimple',
        params: [productId, price]
      });
    } catch (e) {
      console.error('Failed to buy product', productId, e);
      // TODO: handle error
    }
  }, []);

  useEffect(() => {
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

        const { data: products } = response;

        if (!Array.isArray(products)) {
          console.error('Incorrect getProductsByStoreIdSimple response:', response);
          throw new Error('Incorrect products data');
        }

        setProductList(
          await Promise.all(
            products.map(async ([id, productId, _name, _price, metadata, metadataHash, owner]: string[]) => {
              // @ts-ignore
              const productResponse = await window.point.storage.get({ id: metadata, encoding: 'utf-8' });
              const { data: productData } = productResponse;

              if (!productData) {
                console.error('Incorrect product response:', response, {id, productId, _name, _price, metadata, metadataHash, owner});
                throw new Error(`Incorrect product data for product id: ${ id }`);
              }

              const { name, description, price } = JSON.parse(productData);

              return { storeId, productId, name, description, price, owner };
            })
          ) as Product[]
        );
      } catch (e) {
        setProductListError(e);
      }
    })()
  }, [storeId])

  const context = {
    storeId,
    productList,
    productListError,
    buyProduct,
  }

  return <ProductsContext.Provider value={ context }>{ children }</ProductsContext.Provider>
}
