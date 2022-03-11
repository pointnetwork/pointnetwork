// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @dev Interface of the standard identity validator process
 */
 interface IdentityValidator {     
    /**
     * @dev Validates identity by handle
     */
    function validateHandleExists(string calldata handle) external returns(bool handleExists);

    /**
     * @dev Validate identity by address
     */
    function validateAddressExists(address owner) external returns(bool addressExists);
}


contract UserValidator {
    IdentityValidator public identityContract;

    function setIdentityContract(address test) internal  {
        identityContract = IdentityValidator(test);
    }
}