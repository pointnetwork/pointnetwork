// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Store is ERC721 {
    constructor() ERC721("Store", "STOZ") {}

    using Counters for Counters.Counter;
    Counters.Counter internal _storeIds;
    Counters.Counter internal _tokenIds;

    struct StoreFront {
        uint256 id;
        string name;
        string description;
        string logo;
    }

    struct Product {
        uint256 tokenId;
        string name;
        uint256 price;
        string metadata;
        address owner;
    }

    // StoreFront Array
    StoreFront[] stores;

    // Product Arrays and Mappings
    mapping(uint256 => uint256[]) public storeIdToTokenIds;
    mapping(uint256 => Product) public tokenIdToProduct;

    // Events
    event NewStoreEvent(uint id, string name, uint256 timestamp);
    event NewProductEvent(uint tokenId, string name, uint256 timestamp);
    event ProductSoldEvent(uint tokenId, address from, address to, uint256);

    function registerStore(string memory name,
                           string memory description,
                           string memory logo) public {
        _storeIds.increment();
        uint256 newStoreId = _storeIds.current();
        StoreFront memory _store = StoreFront(newStoreId, name, description, logo);
        stores.push(_store);
        emit NewStoreEvent(newStoreId, name, block.timestamp);
    }

    function addProductToStore(uint storeId,
                               string memory name,
                               uint price,
                               string memory metadata) public {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        // Mint new NFT using the sender as the owner and the token id
        _mint(msg.sender, newTokenId);
        // Add product to the store
        Product memory _product = Product(newTokenId, name, price, metadata, msg.sender);
        storeIdToTokenIds[storeId].push(newTokenId);
        // Add the product by its tokenId
        tokenIdToProduct[newTokenId] = _product;
        emit NewProductEvent(newTokenId, name, block.timestamp);
    }

    function buyProduct(uint _tokenId) public payable {
        Product memory product = tokenIdToProduct[_tokenId];
        uint256 productPrice = product.price;
        address ownerAddress = ownerOf(_tokenId);
        require(msg.value >= productPrice, 'You need to send more Ether');
        require(ownerAddress != msg.sender, 'You already own this Product');
        _transfer(ownerAddress, msg.sender, _tokenId);
        payable(ownerAddress).transfer(productPrice);
        product.owner = msg.sender;
        tokenIdToProduct[_tokenId] = product;
        if(msg.value > productPrice) {
            payable(msg.sender).transfer(msg.value - productPrice);
        }
        emit ProductSoldEvent(_tokenId, ownerAddress, msg.sender, block.timestamp);
    }

    function getProductsByStoreId(uint storeId) public view returns(Product[] memory) {
        uint256[] memory storeTokenIds = storeIdToTokenIds[storeId];
        uint256 tokenCount = storeTokenIds.length;
        Product[] memory _storeProducts = new Product[](tokenCount);
        for (uint i = 0; i < tokenCount; i++) {
            uint256 tokenId = storeTokenIds[i];
            Product memory product = tokenIdToProduct[tokenId];
            _storeProducts[i] = product;
        }
        return _storeProducts;
    }

    function getStores() public view returns(StoreFront[] memory) {
        return stores;
    }
}
