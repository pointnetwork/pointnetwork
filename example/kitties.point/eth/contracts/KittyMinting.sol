pragma solidity 0.5.16;

import "./KittyBreeding.sol";

/**
 * @title The KittyMinting contract responsible to create kitties.
 * @author Erno Wever
 */
contract KittyMinting is KittyBreeding {
    /// @dev Limits the number of cats the contract owner can ever create.
    uint256 public constant CREATION_LIMIT_GEN0 = 100;

    /// @dev Counts the number of cats the contract owner has created.
    uint256 public gen0Count;

    /**
     * @notice Creates a new gen0 kitty
     * @dev Can only be called by owner and when limit has not be reached
     * @return The id of the created kitty
     */
    function createGen0Kitty(uint256 _genes) external onlyOwner returns (uint256) {
        require(gen0Count < CREATION_LIMIT_GEN0, "Limit gen0 reached");

        gen0Count = gen0Count.add(1);

        return _createKitty(0, 0, 0, _genes, msg.sender);
    }
}
