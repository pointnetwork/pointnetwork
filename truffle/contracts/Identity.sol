// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;


contract Identity {
    struct PubKey64 {
        bytes32 part1;
        bytes32 part2;
    }

    mapping(string => address) identityToOwner;
    mapping(address => string) ownerToIdentity;
    mapping(string => mapping(string => string)) ikv;
    mapping(string => string[]) public ikvList;
    // At the same time this mapping is used to see if the identity is registered at all
    mapping(string => string) lowercaseToCanonicalIdentities;
    mapping(string => PubKey64) identityToCommPublicKey;
    string[] public identityList;

    bool public migrationApplied = false;

    uint public constant MAX_HANDLE_LENGTH = 16;

    event IdentityRegistered(string handle, address identityOwner, PubKey64 commPublicKey);
    event IdentityOwnershipTransferred(address indexed oldOwner,address indexed newOwner, uint256 date);
    event IKVSet(string identity, string key, string value);

    modifier onlyIdentityOwner(string memory identity) {

        require(msg.sender == getOwnerByIdentity(identity), "You are not the owner of this identity");
        // todo: identityToOwner[identity] == address(0) ?
        _;
    }

    modifier onlyBeforeMigrations() {

        require(migrationApplied == false, "Access denied");
        _;
    }

    function register(
        string memory handle, 
        address identityOwner, 
        bytes32 commPublicKeyPart1, 
        bytes32 commPublicKeyPart2) public {

        if (!_isValidHandle(handle)) revert("Only alphanumeric characters and an underscore allowed");

        // Check if the identity is already registered
        string memory lowercase = _toLower(handle);
        if (!_isEmptyString(lowercaseToCanonicalIdentities[lowercase])) { 
            revert("This identity has already been registered");
        }

        // Check if this owner already has an identity attached
        // if (!_isEmptyString(ownerToIdentity[identityOwner])) revert('This owner already has an identity attached');

        PubKey64 memory commPublicKey = PubKey64(commPublicKeyPart1, commPublicKeyPart2);

        _selfReg(handle, identityOwner, commPublicKey);
    }

    function canonical(string memory anyCase) public view returns (string memory canonicalCase) {
        string memory lowercase = _toLower(anyCase);
        return lowercaseToCanonicalIdentities[lowercase];
    }

    function getIdentityByOwner(address owner) public view returns (string memory identity) {
        return ownerToIdentity[owner];
    }

    function getOwnerByIdentity(string memory identity) public view returns (address owner) {
        return identityToOwner[canonical(identity)];
    }

    function getCommPublicKeyByIdentity(string memory identity) public view returns (PubKey64 memory commPublicKey) {
        return identityToCommPublicKey[canonical(identity)];
    }

    // todo: put or set? decide
    function ikvPut(string memory identity, string memory key, string memory value) public onlyIdentityOwner(identity) {
        ikvSet(identity,key,value);
    }
    
    function ikvImportKV(string memory identity, string memory key, string memory value) public onlyBeforeMigrations() {
        ikvSet(identity,key,value);
    }

    function ikvGet(string memory identity, string memory key) public view returns (string memory value) {
        return ikv[identity][key];
    } 

    function finishMigrations() external {
        migrationApplied = true;
    }

    function transferIdentityOwnership(string memory handle, address newOwner) public onlyIdentityOwner(handle) {
        address oldOwner = msg.sender;
        
        delete ownerToIdentity[oldOwner];

        identityToOwner[handle] = newOwner;
        ownerToIdentity[newOwner] = handle;

        emit IdentityOwnershipTransferred(oldOwner, newOwner, block.timestamp);
    }

    //*** Internal functions ***//
    function _isAlphaNumeric(bytes1 char) internal pure returns (bool) {

        return (
            (char >= bytes1(uint8(0x30)) && char <= bytes1(uint8(0x39))) || // 9-0
            (char >= bytes1(uint8(0x41)) && char <= bytes1(uint8(0x5A))) || // A-Z
            (char >= bytes1(uint8(0x61)) && char <= bytes1(uint8(0x7A))) // a-z
        );
    }

    function _isValidHandle(string memory str) internal pure returns (bool) {

        bytes memory b = bytes(str);
        if (b.length > MAX_HANDLE_LENGTH) return false;

        for (uint i; i < b.length; i++) {
            bytes1 char = b[i];

            if (!_isAlphaNumeric(char) && !(char == bytes1(uint8(0x5f)))) {
                return false; // neither alpha-numeric nor '_'
            }
        }

        return true;
    }

    function _toLower(string memory str) internal pure returns (string memory) {

        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            // Is it an uppercase alphabetic character?
            if ((bStr[i] >= bytes1(uint8(65))) && (bStr[i] <= bytes1(uint8(90)))) {
                // Yes, add 32 to make it lowercase
                bLower[i] = bytes1(uint8(uint(uint8(bStr[i])) + 32));
            } else {
                // No
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    function _isEmptyString(string memory str) internal pure returns (bool result) {
        return (bytes(str).length == 0);
    }

    function _selfReg(string memory handle, address owner, PubKey64 memory commPublicKey) internal {
        // Attach this identity to the owner address
        identityToOwner[handle] = owner;
        ownerToIdentity[owner] = handle;

        // Attach public key for communication
        identityToCommPublicKey[handle] = commPublicKey;

        // Add canonical version
        lowercaseToCanonicalIdentities[_toLower(handle)] = handle;

        // Add the handle to identity list so that it can be iterated over
        identityList.push(handle);

        emit IdentityRegistered(handle, owner, commPublicKey);
    }

    function ikvSet(string memory identity, string memory key, string memory value) internal {
        if (bytes(ikv[identity][key]).length == 0) {
            ikvList[identity].push(key);
        }

        ikv[identity][key] = value;

        emit IKVSet(identity, key, value);
    }
}