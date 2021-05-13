// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <=0.8.0;
pragma experimental ABIEncoderV2;

import './openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol';


contract Store is ERC1155 {
    
    constructor() public ERC1155("{id}") {}
    
    struct StoreFront {
        uint id;
        string name;
        string description;
        string logo;
        bool exists;
    }
    
    struct Product {
        bytes32 id;
        string name;
        uint price;
        uint storeId;
        string metadataHash;
    }
    
    
    mapping(address => StoreFront) public Stores;
    mapping (address => Product[]) public Products;
    
    uint internal storeIdIncrementor;
    uint internal _tokenId;
    
    // events
    event NewProductEvent(string name, uint price, string storeId);
    
    modifier storeExist() {
        if (Stores[msg.sender].exists) revert('You already have an existing store');
        _;
    }
    
    function registerStore(string memory name, string memory description, string memory logo) public storeExist {
        uint storeId = storeIdIncrementor++;
        StoreFront memory _store = StoreFront(storeId, name, description, logo, true);
        Stores[msg.sender] = _store;
    }

      function addProductToStore(string memory name, uint price, string memory metadataHash ) public returns (uint256) {
        uint newProductId = _tokenId++;
        bytes32 productId = keccak256(abi.encodePacked(name, price, metadataHash));
        Product memory _product = Product(productId, name, price, Stores[msg.sender].id, metadataHash);
        bytes memory metadata = bytes(metadataHash);
        _mint(msg.sender, newProductId, 1, metadata);
        Products[msg.sender].push(_product);
        return newProductId;
      }
    
      function getStore() public view returns(uint, string memory, string memory, string memory) {
        StoreFront memory store = Stores[msg.sender];
        return (store.id, store.name, store.description, store.logo);
      }
      
}
