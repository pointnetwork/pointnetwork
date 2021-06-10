import React from 'react'
import { ProvideProductsContext, useProductsContext, Product } from './Context'

const Product = ({ storeId, productId, name, description, price }: Product) => {
  return (
    <div className="store">
        <h3 className="name">{ name }</h3>
        <p><i className="description">{ description }</i></p>
        <p className="price">Price: { price }</p>
        <button onClick={(e) => buyProduct(productId)}>Buy</button>
        <hr/>
    </div>
  )
}

const buyProduct = (productId:string) => {
  console.log('Bought product with id: ', productId)
}

const ProductList = () => {
  const { store, productList } = useProductsContext()

  if (!store) {
    return (
      <p>Loading...</p>
    )
  }

  if (!productList.length) {
    return (
      <p>No products yet...</p>
    )
  }

  return <>{ productList.map((p)=> <Product key={ p.productId } {...p}/>)}</>
}

export const Products = () => <ProvideProductsContext><ProductList/></ProvideProductsContext>
