pragma solidity 0.5.16;

import "./utils/SafeMath.sol";
import "./utils/Ownable.sol";

/**
 * @title The base contract that contains the base logic, structs and data that are needed
 * @author Erno Wever
 */
contract KittyBase is Ownable {
    using SafeMath for uint256;

    /**
     * @dev The Birth event is fired every time a new kitty is created.
     * This inlcudes creation through breeding and creation via gen0
     */
    event Birth(
        address owner,
        uint256 kittyId,
        uint256 momId,
        uint256 dadId,
        uint256 genes
    );

    /**
     * @dev [ERC721] This emits when ownership of a Kitty changes by any mechanism.
     * This event emits when Kitties are created (`from` == 0) and destroyed
     * (`to` == 0). Exception: during contract creation, any number of Kitties
     * may be created and assigned without emitting Transfer. At the time of
     * any transfer, the approved address for that Kitty (if any) is reset to none.
     */
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed kittyId
    );

    /**
     * @dev [ERC721]  This emits when the approved address for an Kitty is changed or
     * reaffirmed. The zero address indicates there is no approved address.
     * When a Transfer event emits, this also indicates that the approved
     * address for that Kitty (if any) is reset to none.
     */
    event Approval(
        address indexed _owner,
        address indexed _approved,
        uint256 indexed _kittyId
    );

    /**
     * @dev This emits when an operator is enabled or disabled for an owner.
     * The operator can manage all Kitties of the owner.
     */
    event ApprovalForAll(
        address indexed _owner,
        address indexed _operator,
        bool _approved
    );

    /**
     * @dev The main Kitty struct, that contains all info about a kitty
     */
    struct Kitty {
        // The unique genes of this kitty
        uint256 genes;
        // The timestamp from the block when the kitty was born
        uint64 birthTime;
        // The references to its parents, set to 0 for gen0 cats
        uint32 momId;
        uint32 dadId;
        // The genereation of the kitty. Kitties start with gen0,
        // and each breeded generation will have a higher generation number
        uint16 generation;
    }

    /**
     * @dev An array containing all kitties
     */
    Kitty[] internal _kitties;

    /// @dev Mapping from kitty id to owner address, must be a valid non-0 address
    mapping(uint256 => address) internal _kittyIdToOwner;
    /// @dev Mapping from kitty id to approved address
    mapping(uint256 => address) internal _kittyIdToApproved;
    /// @dev Mapping from owner to number of owned kitty
    mapping(address => uint256) internal _ownedKittiesCount;
    /// @dev Mapping from kitty id to number of children
    mapping(uint256 => uint256[]) internal _kittyToChildren;

    /// @dev Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) internal _operatorApprovals;

    /**
     * @dev Assign ownership of a specific Kitty to an address.
     * @dev This poses no restriction on msg.sender
     * @param _from The address from who to transfer from, can be 0 for creation of a kitty
     * @param _to The address to who to transfer to, cannot be 0 address
     * @param _kittyId The id of the transfering kitty,
     */
    function _transfer(
        address _from,
        address _to,
        uint256 _kittyId
    ) internal {
        require(_to != address(0), "transfer to the zero address");
        require(_to != address(this));

        _ownedKittiesCount[_to] = _ownedKittiesCount[_to].add(1);
        _kittyIdToOwner[_kittyId] = _to;

        if (_from != address(0)) {
            _ownedKittiesCount[_from] = _ownedKittiesCount[_from].sub(1);
            delete _kittyIdToApproved[_kittyId];
        }

        emit Transfer(_from, _to, _kittyId);
    }

    /**
     * @dev Logic for creation of a kitty, via gen0 creation or breeding.
     * @param _momId The mother of the kitty (0 for gen0)
     * @param _dadId The dad of the kitty (0 for gen0)
     * @param _generation The generation number of this cat, must be computed by caller
     * @param _genes The generic code, must me computed by the caller
     * @param _owner The initial owner, must me non-zero
     * @return The id of the created kitty
     */
    function _createKitty(
        uint256 _momId,
        uint256 _dadId,
        uint256 _generation,
        uint256 _genes,
        address _owner
    ) internal returns (uint256) {
        Kitty memory _kitty = Kitty({
            genes: _genes,
            birthTime: uint64(block.timestamp),
            momId: uint32(_momId),
            dadId: uint32(_dadId),
            generation: uint16(_generation)
        });

        uint256 newKittyId = _kitties.push(_kitty).sub(1);

        emit Birth(_owner, newKittyId, _momId, _dadId, _genes);

        _transfer(address(0), _owner, newKittyId);

        return newKittyId;
    }
}
