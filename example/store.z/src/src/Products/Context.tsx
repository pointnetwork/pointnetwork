import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import { useRoute } from 'wouter'
import point from '~/point'

export type Product = {
  storeId: string,
  productId: string,
  name: string,
  description: string,
  price: number,
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
      // window.point.contract.call(host, contractName, method, params)
      let productsData = await window.point.contract.call('store', 'Store', 'getProductsByStoreId', store)
      let products:any = []

      productsData.forEach((productData:any) => {
        let product = {
          name: productData[2],
          price: productData[3],
          description: productData[4]
        }

        products.push(product)
      })

      setProductList(products as Product[]) // TODO: error handling
    })()
  }, [store])

  const context = {
    store,
    productList,
  }

  return <ProductsContext.Provider value={ context }>{ children }</ProductsContext.Provider>
}
