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
    mapping (uint => Product[]) public StoreProducts;
    mapping (bytes32 => ProductBid) public Bids;

    // A simple direct mapping of token id (uint) -> Product (struct)
    mapping(uint => Product) public Products;
    uint[] public productList;
    // A mapping of store id to product token ids
    // mapping (uint => uint[]) public StoreProductsSimple;

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

    function addProductToStore(string memory name, uint price, string memory metadata) public returns (bytes32) {
        uint newProductId = _tokenId++;
        bytes32 productId = keccak256(abi.encodePacked(name, price, metadata));
        bytes memory metadataHash = bytes(metadata);
        Product memory _product = Product(productId, newProductId, name, price, metadata, metadataHash, msg.sender);
        _mint(msg.sender, newProductId, 1, metadataHash);
        StoreProducts[Stores[msg.sender].id].push(_product);
        Products[newProductId] = _product;
        productList.push(newProductId);
        emit NewProductEvent(productId, newProductId, name, price, metadata, msg.sender);
        return productId;
    }

    // A simple buy product example function for demo purpose only
    function buyProductSimple(uint tokenId) public payable {
        Product memory _product = Products[tokenId];
        require(msg.value >= _product.price, 'You need to send more Ether');
        require(_product.owner != msg.sender, 'You already own this Product');

        address owner = _product.owner;
        payable(owner).transfer(_product.price);
        _product.owner = msg.sender;
        Products[tokenId] = _product;
        emit ProductSoldEvent(owner, msg.sender, _product.id, _product.metadata);
    }

    function getProductsByStoreIdSimple(uint storeId) public view returns(Product[2] memory) {
        return [Products[0], Products[1], Products[2]];
    }

    function getStore() public view returns(uint, string memory, string memory, string memory) {
        StoreFront memory store = Stores[msg.sender];
        return (store.id, store.name, store.description, store.logo);
    }

    function getStores() public view returns(StoreFront[] memory) {
        return allStores;
    }

    function getProductsByStoreId(uint storeId) public view returns(Product[] memory) {
        return StoreProducts[storeId];
    }

    function isStoreRegistered() public view  returns(bool) {
        if (Stores[msg.sender].exists) {
          return true;
        }
        return false;
    }

    // function buyProduct (uint storeId, bytes32 productId) public noStoreExist payable returns(bool) {
    //     require(!Bids[productId].exists);
    //     for (uint i = 0; i < StoreProducts[storeId].length; i++) {
    //       if (StoreProducts[storeId][i].id == productId) {
    //         require (msg.value >= StoreProducts[storeId][i].price);
    //         ProductBid memory _bids = ProductBid(msg.sender, msg.value, true, false);
    //         Bids[productId] = _bids;
    //         return true;
    //       }
    //     }
    //     return false;
    // }

    // function sellProduct(uint storeId, bytes32 productId) public noStoreExist payable returns(bool) {
    //     require(Bids[productId].exists && !Bids[productId].isSold);
    //     for (uint i = 0; i < StoreProducts[storeId].length; i++) {
    //       if (StoreProducts[storeId][i].id == productId) {

    //         safeTransferFrom(msg.sender, Bids[productId].bidder, StoreProducts[storeId][i].tokenId, 1, StoreProducts[storeId][i].metadataHash);
    //         StoreProducts[Stores[Bids[productId].bidder].id].push(StoreProducts[storeId][i]);
    //         StoreProducts[storeId][i] = StoreProducts[storeId][StoreProducts[storeId].length - 1];
    //         delete StoreProducts[storeId][StoreProducts[storeId].length - 1];
    //         return true;
    //       }
    //     }
    //     return false;
    // }
}
