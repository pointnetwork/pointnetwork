// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';


contract Store is ERC1155 {

    constructor() ERC1155("{id}") {}

    struct StoreFront {
        uint id;
        string name;
        string description;
        string logo;
        bool exists;
    }

    struct Product {
        bytes32 id;
        uint tokenId;
        string name;
        uint price;
        string metadata;
        bytes metadataHash;
        address owner;
    }

    struct ProductBid {
        address bidder;
        uint price;
        bool exists;
        bool isSold;
    }

    StoreFront[] allStores;
    mapping(address => StoreFront) public Stores;
    mapping (uint => Product[]) public Products;
    mapping (bytes32 => ProductBid) public Bids;

    // A simple mapping of token id (uint) -> Product (struct)
    mapping(uint => Product) public ProductsSimple;

    uint internal storeIdIncrementor;
    uint internal _tokenId;

    // events
    event NewStoreEvent(uint id, string name, string description);
    event NewProductEvent(bytes32 id, uint tokenId, string name, uint price, string metadata, address owner);
    event ProductSoldEvent(address from, address to, bytes32 productId, string metadata);

    modifier storeExist() {
        if (Stores[msg.sender].exists) revert('You already have an existing store');
        _;
    }

    modifier noStoreExist() {
        if (!Stores[msg.sender].exists) revert('Please register a store');
        _;
    }

    function registerStore(string memory name, string memory description, string memory logo) public storeExist {
        uint storeId = storeIdIncrementor++;
        StoreFront memory _store = StoreFront(storeId, name, description, logo, true);
        Stores[msg.sender] = _store;
        allStores.push(_store);
        emit NewStoreEvent(storeId, name, description);
    }

    function addProductToStore(string memory name, uint price, string memory metadata ) public returns (bytes32) {
        uint newProductId = _tokenId++;
        bytes32 productId = keccak256(abi.encodePacked(name, price, metadata));
        bytes memory metadataHash = bytes(metadata);
        Product memory _product = Product(productId, newProductId, name, price, metadata, metadataHash, msg.sender);
        _mint(msg.sender, newProductId, 1, metadataHash);
        Products[Stores[msg.sender].id].push(_product);
        ProductsSimple[newProductId] = _product;
        emit NewProductEvent(productId, newProductId, name, price, metadata, msg.sender);
        return productId;
    }

    // A simple buy product example function for demo purpose only
    function buyProductSimple(uint tokenId) public payable {
        Product memory _product = ProductsSimple[tokenId];
        require(msg.value >= _product.price, 'You need to send more Ether');
        address owner = _product.owner;
        payable(owner).transfer(_product.price);
        _product.owner = msg.sender;
        ProductsSimple[tokenId] = _product;
        emit ProductSoldEvent(owner, msg.sender, _product.id, _product.metadata);
    }

    function getStore() public view returns(uint, string memory, string memory, string memory) {
        StoreFront memory store = Stores[msg.sender];
        return (store.id, store.name, store.description, store.logo);
    }

    function getStores() public view returns(StoreFront[] memory) {
        return allStores;
    }

    function getProductsByStoreId(uint storeId) public view  returns(Product[] memory) {
        return Products[storeId];
    }

    function isStoreRegistered() public view  returns(bool) {
        if (Stores[msg.sender].exists) {
          return true;
        }
        return false;
    }

    function buyProduct (uint storeId, bytes32 productId) public noStoreExist payable returns(bool) {
        require(!Bids[productId].exists);
        for (uint i = 0; i < Products[storeId].length; i++) {
          if (Products[storeId][i].id == productId) {
            require (msg.value >= Products[storeId][i].price);
            ProductBid memory _bids = ProductBid(msg.sender, msg.value, true, false);
            Bids[productId] = _bids;
            return true;
          }
        }
        return false;
    }

    function sellProduct(uint storeId, bytes32 productId) public noStoreExist payable returns(bool) {
        require(Bids[productId].exists && !Bids[productId].isSold);
        for (uint i = 0; i < Products[storeId].length; i++) {
          if (Products[storeId][i].id == productId) {

            safeTransferFrom(msg.sender, Bids[productId].bidder, Products[storeId][i].tokenId, 1, Products[storeId][i].metadataHash);
            Products[Stores[Bids[productId].bidder].id].push(Products[storeId][i]);
            Products[storeId][i] = Products[storeId][Products[storeId].length - 1];
            delete Products[storeId][Products[storeId].length - 1];
            return true;
          }
        }
        return false;
    }
}
