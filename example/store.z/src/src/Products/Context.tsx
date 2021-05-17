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
      setProductList(JSON.parse(await point.contract.get({
        host: 'store',
        contractName: 'Store',
        method: 'getProducts',
        args: [store]
      })) as Product[]) // TODO: error handling
    })()
  }, [store])

  const context = {
    store,
    productList,
  }

  return <ProductsContext.Provider value={ context }>{ children }</ProductsContext.Provider>
}
