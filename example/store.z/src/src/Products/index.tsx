import React from 'react'
import { ProvideProductsContext, useProductsContext } from './Context'
import { ProductItem } from '~/ProductItem';

const ProductList = () => {
  const { storeId, productList, productListError } = useProductsContext()

  if (productListError) {
      return <span className='error'>{ productListError.message }</span>
  }

  if (!storeId || !productList) {
    return <span>Loading...</span>
  }

  if (!productList.length) {
    return <span>No products yet...</span>
  }

  return <ul>{ productList.map((data)=> <ProductItem key={ data.productId } data={ data }/>)}</ul>
}

export const Products = () => <ProvideProductsContext><ProductList/></ProvideProductsContext>
