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

    uint public MAX_HANDLE_LENGTH = 16;

    event IdentityRegistered(string handle, address identityOwner, PubKey64 commPublicKey);
    event IKVSet(string identity, string key, string value);

    constructor() {
        _selfReg('storage_provider', 0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301, PubKey64({part1: 0xb192de79890d7dd86de3eb3343e16b873f7acff3cf9c49c4587337f06b744b41, part2: 0x6a34054dd05f0e6ffd720bf61e3aa1858bff9e1e95df22469f6b693fc9725376}));
        // 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB is node2, deployer
        _selfReg('demo', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('email', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('blog', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('hello', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('profile', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('twitter', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('store', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('pointsocial', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('explorer', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('zengarden', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));
        _selfReg('template', 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB, PubKey64({part1: 0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a22, part2: 0x8cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56}));

        _selfReg('node3', 0xf990AB98B33dd48dffaC735C572D6cd8f75E60d8, PubKey64({part1: 0x1b26e2c556ae71c60dad094aa839162117b28a462fc4c940f9d12675d3ddfff2, part2: 0xaeef60444a96a46abf3ca0a420ef31bff9f4a0ddefe1f80b0c133b85674fff34}));
    }

    function _selfReg(string memory handle, address owner, PubKey64 memory commPublicKey) internal {
        identityToOwner[handle] = owner;
        ownerToIdentity[owner] = handle;
        identityToCommPublicKey[handle] = commPublicKey;
        lowercaseToCanonicalIdentities[_toLower(handle)] = handle;
        identityList.push(handle);
    }

    function register(string memory handle, address identityOwner, PubKey64 memory commPublicKey) public {
        if (!_isValidHandle(handle)) revert('Only alphanumeric characters and an underscore allowed');

        // Check if the identity is already registered
        string memory lowercase = _toLower(handle);
        if (!_isEmptyString(lowercaseToCanonicalIdentities[lowercase])) revert('This identity has already been registered');

        // Check if this owner already has an identity attached
        if (!_isEmptyString(ownerToIdentity[identityOwner])) revert('This owner already has an identity attached');

        // Attach this identity to the owner address
        identityToOwner[handle] = identityOwner;
        ownerToIdentity[identityOwner] = handle;

        // Attach public key for communication
        identityToCommPublicKey[handle] = commPublicKey;

        // Add canonical version
        lowercaseToCanonicalIdentities[lowercase] = handle;

        // Add the handle to identity list so that it can be iterated over
        identityList.push(handle);

        emit IdentityRegistered(handle, identityOwner, commPublicKey);
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

    modifier onlyIdentityOwner(string memory identity) {
        require(msg.sender == getOwnerByIdentity(identity), 'You are not the owner of this identity');
        // todo: identityToOwner[identity] == address(0) ?
        _;
    }

    // todo: put or set? decide
    function ikvPut(string memory identity, string memory key, string memory value) public onlyIdentityOwner(identity) {
        if (bytes(ikv[identity][key]).length == 0) {
            ikvList[identity].push(key);
        }

        ikv[identity][key] = value;

        emit IKVSet(identity, key, value);
    }

    function ikvGet(string memory identity, string memory key) public view returns (string memory value) {
        return ikv[identity][key];
    }

    //*** Internal functions ***//

    function _isAlphaNumeric(bytes1 char) internal pure returns (bool) {
        return (
            (char >= bytes1(uint8(0x30)) && char <= bytes1(uint8(0x39))) || // 9-0
            (char >= bytes1(uint8(0x41)) && char <= bytes1(uint8(0x5A))) || // A-Z
            (char >= bytes1(uint8(0x61)) && char <= bytes1(uint8(0x7A))) // a-z
        );
    }

    function _isValidHandle(string memory str) internal view returns (bool) {
        bytes memory b = bytes(str);
        if(b.length > MAX_HANDLE_LENGTH) return false;

        for(uint i; i<b.length; i++){
            bytes1 char = b[i];

            if(!_isAlphaNumeric(char) && !(char == bytes1(uint8(0x5f)))) {
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
}