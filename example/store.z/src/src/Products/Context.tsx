import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import { useRoute } from 'wouter'

export type Product = {
  storeId: string,
  productId: string,
  name: string,
  description: string,
  price: string,
  owner: string
}

export type ProductsRouteParams = {
  store: string
}

const defaultContext = {
  store: undefined as string | undefined,
  productList: [] as Array<Product>
}

const ProductsContext = createContext(defaultContext)

export const useProductsContext = () => useContext(ProductsContext)
export const ProvideProductsContext = ({ children }: { children: ReactNode }) => {
  const [store, setStore] = useState<string>()
  const [productList, setProductList] = useState<Array<Product>>([])
  const [, params] = useRoute<ProductsRouteParams>('/products/:store')

  if (params?.store && params.store !== store) {
    setStore(params.store)
  }

  useEffect(() => {
    if (!store) {
      return
    }

    (async () => {
      // @ts-ignore
      const productsData = await window.point.contract.call({
          contract: 'Store',
          method: 'getProductsByStoreIdSimple',
          params: [store]
      });

      console.log({productsData});

      const products:Product[] = [];

      for(let i = 0; i < productsData.length; i++) {
        // @ts-ignore
        const product = JSON.parse(await window.point.storage.getById(productsData[i][4]));

        console.info({item: productsData[i]})

        product.productId = productsData[i][1]; // product 'tokenId'
        product.owner = productsData[i][6]; // product.owner
        products.push(product);

        console.log({product});
      }

      setProductList(products as Product[]) // TODO: error handling
    })()
  }, [store])

  const context = {
    store,
    productList,
  }

  return <ProductsContext.Provider value={ context }>{ children }</ProductsContext.Provider>
}
