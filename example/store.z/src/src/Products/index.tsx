import React from 'react'
import { useAppContext } from '~App/Context';
import { ProvideProductsContext, useProductsContext, Product } from './Context'

const Product = ({ storeId, productId, name, description, price, owner }: Product) => {
  const { buyProduct } = useProductsContext();
  const { walletAddress } = useAppContext();
  const owned = owner === walletAddress;

  return (
    <li className="store">
      <h3 className="name">{ name }</h3>
      <p className="description">{ description }</p>
      <span className="price">Price: { price }</span>
      {
        owned ? <span className='owner'>You own this!</span> : (
          <button onClick={ () => buyProduct(productId, price) }>Buy</button>
        )
      }
    </li>
  )
}

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

  return <ul>{ productList.map((p)=> <Product key={ p.productId } {...p}/>)}</ul>
}

export const Products = () => <ProvideProductsContext><ProductList/></ProvideProductsContext>
