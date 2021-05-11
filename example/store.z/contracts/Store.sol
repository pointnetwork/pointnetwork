// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

contract Store {

  struct StoreFront {
    string id;
    string name;
    string description;
    string logo;
  }

  struct Product {
    string id;
    string name;
    string description;
    uint price;
  }

  StoreFront[] stores;

  mapping(string => Product[]) productsByStoreId;

  function registerStore(string memory storeId, string memory name, string memory description, string memory logo) public {
    StoreFront memory _store = StoreFront(storeId, name, description, logo);
    stores.push(_store);
  }

  function getStores() public view returns(StoreFront[] memory) {
    return stores;
  }

  function getProductsByStoreId(string memory storeId) public view  returns(Product[] memory) {
    return productsByStoreId[storeId];
  }

  function addProductToStore(string memory storeId, string memory productId, string memory name, string memory description, uint price) public {
    // create new product
    Product memory _product = Product(productId, name, description, price);
    // add to the productsByStoreId mapping
    productsByStoreId[storeId].push(_product);
  }
}