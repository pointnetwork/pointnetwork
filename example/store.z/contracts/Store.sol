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

  StoreFront[] stores;

  function registerStore(string memory storeId, string memory name, string memory description, string memory logo) public {
    StoreFront memory _store = StoreFront(storeId, name, description, logo);
    stores.push(_store);
  }

  function getStores() public view returns(StoreFront[] memory) {
    return stores;
  }
}