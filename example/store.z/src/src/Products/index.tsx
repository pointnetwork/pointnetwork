import React from 'react'
import { ProvideProductsContext, useProductsContext, Product } from './Context'

const Product = ({ storeId, productId, name, description, price, owner }: Product) => {
  const renderBuyButton = (owner:string) => {
    if(owner=='0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB'){
      return <b>YOU OWN THIS!</b>
    } else{
      return <button onClick={(e) => buyProduct(productId, price)}>Buy</button>
    }
  }
  return (
    <div className="store">
        <h3 className="name">{ name }</h3>
        <p><i className="description">{ description }</i></p>
        <p className="price">Price: { price }</p>
        {renderBuyButton(owner)}
        <hr/>
    </div>
  )
}

const buyProduct = async (productId:string, price:string) => {
  console.log(`Selected to purchase product tokenId: ${productId} with price: ${price}`)
  // await window.point.contract.send('store', 'Store', 'buyProductSimple', productId, price);
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
