pragma solidity 0.5.16;

import "./KittyMinting.sol";

/**
 * @title The KittyCore contract.
 * @author Erno Wever
 * @dev This contract is split in the following way:
 *      - KittyBase: This is where we define the most fundamental code shared throughout the core
 *             functionality. This includes our main data storage, constants and data types, plus
 *             internal functions for managing these items.
 *      - KittyOwnership: This provides the methods required for basic non-fungible token
 *      - KittyBreeding: This file contains the methods necessary to breed cats together
 *      - KittyMinting: This final facet contains the functionality we use for creating new gen0 cats.
 */
contract KittyCore is KittyMinting {
    /**
     * @notice Returns all the relevant information about a specific kitty
     * @param _kittyId the id of the kitty to get information from
     */
    function getKitty(uint256 _kittyId)
        public
        view
        returns (
            uint256 genes,
            uint256 birthTime,
            uint256 dadId,
            uint256 momId,
            uint256 generation
        )
    {
        Kitty storage kitty = _kitties[_kittyId];

        birthTime = uint256(kitty.birthTime);
        dadId = uint256(kitty.dadId);
        momId = uint256(kitty.momId);
        generation = uint256(kitty.generation);
        genes = kitty.genes;
    }
}
