// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
 
/**
 * @dev Interface of the standard identity validator process
 */
 interface Identity {     
    /**
     * @dev Validates identity by handle
     */
    function getOwnerByIdentity(string memory identity) external view returns (address owner);

    /**
     * @dev Validate identity by address
     */
    function getIdentityByOwner(address owner) external view returns (string memory identity);
}

abstract contract IdentityValidator {
    Identity public identityContract;

    function setIdentityContract(address validator) internal  {
        identityContract = Identity(validator);
    }

    function isValidAddress(address owner) internal view returns (bool exists) {
        return bytes(identityContract.getIdentityByOwner(owner)).length != 0; 
    }

    function isValidHandle(string memory handle) internal view returns (bool exists) {
        return identityContract.getOwnerByIdentity(handle) != address(0);
    }
}
