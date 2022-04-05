pragma solidity 0.5.16;

import "./utils/Ownable.sol";
import "./KittyCore.sol";
import "./KittyCore.sol";

/**
 * @title The MarketPlace contract.
 * @author Erno Wever
 * @dev It takes ownership of the kitty for the duration that it is on the marketplace
 */
contract MarketPlace is Ownable {
    using SafeMath for uint256;

    struct Offer {
        address payable seller;
        uint256 price;
        uint256 index;
        uint256 tokenId;
        bool active;
    }

    event MarketTransaction(string TxType, address owner, uint256 tokenId);
    
    KittyCore private _kittyContract;
    uint256[] private _offeredTokenIds;
    mapping(uint256 => Offer) private _tokenIdToOffer;

    /**
     * @notice Set the current KittyContract address and initialize the instance of Kittycontract.
     * @dev Requirement: Only the contract owner can call.
     * @param _kittyContractAddress the address of the KittyCore contract to interact with
     */
    function setKittyCoreContract(address _kittyContractAddress)
        public
        onlyOwner
    {
        _kittyContract = KittyCore(_kittyContractAddress);
    }

    constructor(address _kittyContractAddress) public {
        setKittyCoreContract(_kittyContractAddress);
    }

    /**
     * @notice Get the details about a offer for _tokenId. Throws an error if there is no active offer for _tokenId.
     * @param _tokenId the id of the token to get the offer from
     * @return the offer
     */
    function getOffer(uint256 _tokenId)
        external
        view
        returns (
            address seller,
            uint256 price,
            uint256 index,
            uint256 tokenId,
            bool active
        )
    {
        Offer storage offer = _tokenIdToOffer[_tokenId];
        return (
            offer.seller,
            offer.price,
            offer.index,
            offer.tokenId,
            offer.active
        );
    }

    /**
     * @notice Get all kitties that are on sale
     * @return all tokenId's that are currently for sale. Returns an empty arror if none exist
     */
    function getAllTokenOnSale()
        external
        view
        returns (uint256[] memory listOfOffers)
    {
        return _offeredTokenIds;
    }

    /**
     * @dev checks if an address owns a kitty
     * @param _address the address to check the ownership of
     * @param _tokenId the id of the kitty to check
     * @return True if the address owns the kitty, false otherwise
     */
    function _ownsKitty(address _address, uint256 _tokenId)
        internal
        view
        returns (bool)
    {
        return (_kittyContract.ownerOf(_tokenId) == _address);
    }

    /**
     * @notice Creates a new offer for _tokenId for the price _price.
     * @dev Requirements:
     * Only the owner of _tokenId can create an offer.
     * There can only be one active offer for a token at a time.
     * Marketplace contract (this) needs to be an approved operator when the offer is created.
     * @param _price the price of the new offer
     * @param _tokenId the id of the kitty
     */
    function setOffer(uint256 _price, uint256 _tokenId) external {
        require(_ownsKitty(msg.sender, _tokenId), "Not the owner");
        require(_tokenIdToOffer[_tokenId].price == 0 , "Already offered");

        require(
            _kittyContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace needs approval"
        );

        Offer memory _offer = Offer({
            seller: msg.sender,
            price: _price,
            active: true,
            tokenId: _tokenId,
            index: _offeredTokenIds.length
        });

        _tokenIdToOffer[_tokenId] = _offer;
        _offeredTokenIds.push(_tokenId);

        emit MarketTransaction("Create offer", msg.sender, _tokenId);
    }

    /**
     * @dev In order to easily requests all _offeredTokenIds, we need to track an array of all the _offeredTokenIds,
     * this needs to be updated on removal. For this we will swap the last element with the current element, 
     * and update the corresponding index in the struct.
     * Note that this is only needed in order to easily request all active _offeredTokenIds as an array
     * Inspired by https://github.com/OpenZeppelin/openzeppelin-contracts/blob/04a1b21874e02fd3027172bf208d9658b886b658/contracts/token/ERC721/ERC721Enumerable.sol
     * @dev Requirement: Only the seller of _tokenId can remove an offer.
     * @param _tokenId the id of the kitty of which its offer needs to remove
     */
    function _removeOffer(uint256 _tokenId) private {
        // Remove from array: move the last token to the current token position
        uint256 lastTokenIndex = _offeredTokenIds.length.sub(1);
        uint256 tokenIndex = _tokenIdToOffer[_tokenId].index;
        uint256 lastTokenId = _offeredTokenIds[lastTokenIndex];

        _offeredTokenIds[tokenIndex] = lastTokenId; // Move the last token to the slot of the to-delete token
        _tokenIdToOffer[lastTokenId].index = tokenIndex; // Update the moved token's index

        // This also deletes the contents at the last position of the array
        _offeredTokenIds.length--;
        _tokenIdToOffer[_tokenId].index = 0;
        
        // Remove from mapping
        delete _tokenIdToOffer[_tokenId];
    }

    /**
     * @notice Removes an existing offer.
     * @dev see _removeOffer
     */
    function removeOffer(uint256 _tokenId) external {
        Offer memory offer = _tokenIdToOffer[_tokenId];
        require(offer.seller == msg.sender, "Not the owner");

        _removeOffer(_tokenId);

        emit MarketTransaction("Remove offer", msg.sender, _tokenId);
    }

    /**
     * @notice Executes the purchase of _tokenId.
     * Sends the funds to the seller and transfers the token using transferFrom in Kittycontract.
     * @dev Requirement:
     * The msg.value needs to equal the price of _tokenId
     * There must be an active offer for _tokenId
     */
    function buyKitty(uint256 _tokenId) external payable {
        Offer memory offer = _tokenIdToOffer[_tokenId];
        require(offer.price > 0, "No active offer");
        require(msg.value == offer.price, "The price is incorrect");

        // Important: delete the kitty from the mapping BEFORE paying out to prevent reentry attacks
        _removeOffer(_tokenId);

        // Transfer the funds to the seller
        // TODO: make this logic pull instead of push
        if (offer.price > 0) {
            offer.seller.transfer(offer.price);
        }

        // Transfer ownership of the kitty
        _kittyContract.transferFrom(offer.seller, msg.sender, _tokenId);

        emit MarketTransaction("Buy", msg.sender, _tokenId);
    }
}
