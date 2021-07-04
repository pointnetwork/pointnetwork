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

    // Store Arrays and Mappings
    StoreFront[] stores;
    mapping(address => StoreFront) public ownerToStoreFront;
    mapping(uint => StoreFront) public storeIdToStoreFront;
    mapping(address => uint[]) public ownerToStoreIds;

    // Product Arrays and Mappings
    mapping (uint => Product[]) public storeIdToProducts;
    mapping(uint => Product) public productIdToProduct;

    uint internal _storeCounter;
    uint internal _tokenCounter;

    // Events
    event NewStoreEvent(uint id, string name, string description);
    event NewProductEvent(bytes32 id, uint tokenId, string name, uint price, string metadata, address owner);
    event ProductSoldEvent(address from, address to, bytes32 productId, string metadata);

    function registerStore(string memory name, string memory description, string memory logo) public  {
        uint storeId = _storeCounter++;
        StoreFront memory _store = StoreFront(storeId, name, description, logo, true);
        ownerToStoreFront[msg.sender] = _store;
        ownerToStoreIds[msg.sender].push(storeId);
        storeIdToStoreFront[storeId] = _store;
        stores.push(_store);
        emit NewStoreEvent(storeId, name, description);
    }

    function addProductToStore(uint storeId, string memory name, uint price, string memory metadata) public returns (bytes32) {
        uint newProductId = _tokenCounter++;
        bytes32 productId = keccak256(abi.encodePacked(name, price, metadata));
        bytes memory metadataHash = bytes(metadata);
        Product memory _product = Product(productId, newProductId, name, price, metadata, metadataHash, msg.sender);
        _mint(msg.sender, newProductId, 1, metadataHash);
        storeIdToProducts[storeId].push(_product);
        productIdToProduct[newProductId] = _product;
        emit NewProductEvent(productId, newProductId, name, price, metadata, msg.sender);
        return productId;
    }

    function buyProduct(uint tokenId) public payable {
        Product memory _product = productIdToProduct[tokenId];
        require(msg.value >= _product.price, 'You need to send more Ether');
        require(_product.owner != msg.sender, 'You already own this Product');

        address owner = _product.owner;
        payable(owner).transfer(_product.price);
        _product.owner = msg.sender;
        productIdToProduct[tokenId] = _product;
        emit ProductSoldEvent(owner, msg.sender, _product.id, _product.metadata);
    }

    function getProductsByStoreId(uint storeId) public view returns(Product[] memory) {
        return storeIdToProducts[storeId];
    }

    function getStores() public view returns(StoreFront[] memory) {
        return stores;
    }
}
