// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

contract Identity {
    mapping(string => address) identityToOwner;
    mapping(address => string) ownerToIdentity;
    mapping(string => address) emailIdentityToOwner;
    mapping(address => string) ownerToEmailIdentity;
    mapping(string => mapping(string => string)) ikv;
    // At the same time this mapping is used to see if the identity is registered at all
    mapping(string => string) lowercaseToCanonicalIdentities;
    mapping(string => string) lowercaseToCanonicalEmailIdentities;

    uint public MAX_HANDLE_LENGTH = 16;
    uint public MAX_EMAIL_LENGTH = 32;

    event IdentityRegistered(string handle, address identityOwner);
    event EmailIdentityRegistered(string emailIdentity, address identityOwner);
    event IKVSet(string identity, string key, string value);

    constructor() public {
        // Some initial domains for the demos, you can add your own, or better yet, register through normal means
        identityToOwner['storage_provider'] = 0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301;
        ownerToIdentity[0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301] = 'storage_provider';

        identityToOwner['demo'] = 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB;
        identityToOwner['email'] = 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB;
        identityToOwner['example'] = 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB;
        identityToOwner['hello'] = 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB;
        identityToOwner['profile'] = 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB;
        identityToOwner['twitter'] = 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB;
        identityToOwner['node3'] = 0xf990AB98B33dd48dffaC735C572D6cd8f75E60d8;
        ownerToIdentity[0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB] = 'demo';
        ownerToIdentity[0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB] = 'email';
        ownerToIdentity[0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB] = 'example';
        ownerToIdentity[0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB] = 'hello';
        ownerToIdentity[0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB] = 'profile';
        ownerToIdentity[0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB] = 'twitter';
        ownerToIdentity[0xf990AB98B33dd48dffaC735C572D6cd8f75E60d8] = 'node3';

        // Address 0x4f587 ... is for test node 2
        ikv['0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB']['public_key'] = '0x5befb2b9737edb839afde5ded2b8187aa17f640c5a953f726242d50cc3b18a228cf4b8a2e249f236fc50362194dd524d25f458e9fcf3a70ce36904ab85316f56';

        // Address 0xf990A ... is for test node 3
        ikv['0xf990AB98B33dd48dffaC735C572D6cd8f75E60d8']['public_key'] = '0x1b26e2c556ae71c60dad094aa839162117b28a462fc4c940f9d12675d3ddfff2aeef60444a96a46abf3ca0a420ef31bff9f4a0ddefe1f80b0c133b85674fff34';

        ownerToEmailIdentity[0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301] = 'socrates@email.z';
        ownerToEmailIdentity[0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB] = 'plato@email.z';
        ownerToEmailIdentity[0xf990AB98B33dd48dffaC735C572D6cd8f75E60d8] = 'aristotle@email.z';
        emailIdentityToOwner['socrates@email.z'] = 0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301;
        emailIdentityToOwner['plato@email.z'] = 0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB;
        emailIdentityToOwner['aristotle@email.z'] = 0xf990AB98B33dd48dffaC735C572D6cd8f75E60d8;
    }

    function register(string memory handle, address identityOwner) public {
        if (!_isValidHandle(handle)) revert('Only alphanumeric characters and an underscore allowed');

        // Check if the identity is already registered
        string memory lowercase = _toLower(handle);
        if (!_isEmptyString(lowercaseToCanonicalIdentities[lowercase])) revert('This identity has already been registered');

        // Check if this owner already has an identity attached
        if (!_isEmptyString(ownerToIdentity[identityOwner])) revert('This owner already has an identity attached');

        // Attach this identity to the owner address
        identityToOwner[handle] = identityOwner;
        ownerToIdentity[identityOwner] = handle;

        // Add canonical version
        lowercaseToCanonicalIdentities[lowercase] = handle;

        emit IdentityRegistered(handle, identityOwner);
    }

    function registerEmailIdentity(string memory emailIdentity, address identityOwner) public {
        if (!_isValidEmail(emailIdentity)) {
            revert('Email address is not valid');
        }

        // Check if the email address is already registered
        string memory lowercase = _toLower(emailIdentity);
        if (!_isEmptyString(lowercaseToCanonicalEmailIdentities[lowercase])) {
            revert('This email address has already been registered');
        }

        // Check if this owner already has an email address attached
        if (!_isEmptyString(ownerToEmailIdentity[identityOwner])) {
            revert('This owner already has an email address attached');
        }

        // Attach this email address to the owner address
        emailIdentityToOwner[emailIdentity] = identityOwner;
        ownerToEmailIdentity[identityOwner] = emailIdentity;

        // Add a canonical version
        lowercaseToCanonicalEmailIdentities[lowercase] = emailIdentity;

        emit EmailIdentityRegistered(emailIdentity, identityOwner);
    }

    function getIdentityByOwner(address owner) public view returns (string memory identity) {
        return ownerToIdentity[owner];
    }

    function getEmailIdentityByOwner(address owner) public view returns (string memory emailIdentity) {
        return ownerToEmailIdentity[owner];
    }

    modifier onlyIdentityOwner(string memory identity) {
        if (msg.sender != identityToOwner[identity]) revert('You are not the owner of this identity'); // todo: identityToOwner[identity] == address(0) ?
        _;
    }

    // In the prototype, we don't check who owns the domain
    function ikvPut(string memory identity, string memory key, string memory value) public onlyIdentityOwner(identity) {
        ikv[identity][key] = value;

        emit IKVSet(identity, key, value);
    }

    function ikvGet(string memory identity, string memory key) public view returns (string memory value) {
        return ikv[identity][key];
    }

    //*** Internal functions ***//

    function _isValidEmail(string memory str) internal view returns (bool) {
        // https://en.wikipedia.org/wiki/Email_address#Syntax
        bytes memory bstr = bytes(str);

        if((bstr.length > MAX_EMAIL_LENGTH) || (bstr[0] == bytes1(uint8(0x2E)))) { // '.'
            return false;
        }

        bool localPartComplete = false;
        bool domainComplete = false; // currently sub-domains are not supported
        bool topLevelDomainComplete = false;

        uint8 localPartLength = 0;
        uint8 domainLength = 0;
        uint8 topLevelDomainLength = 0;

        for (uint i = 0; i < bstr.length; i++) {
            bytes1 char = bstr[i];

            if (localPartComplete) {
                if (domainComplete) {
                    if (char == bytes1(uint8(0x5A)) || char == bytes1(uint8(0x7A))) { // 'z' or 'Z'
                        topLevelDomainComplete = true;
                    }
                    if (topLevelDomainLength > 0) {
                        return false;
                    }
                    topLevelDomainLength++;
                } else if (char == bytes1(uint8(0x2E))) { // '.'
                    domainComplete = true;
                } else if (
                    !_isAlphaNumeric(char) &&
                    !(char == bytes1(uint8(0x95))) && // '_'
                    !(char == bytes1(uint8(0x2D)))    // '-'
                ) {
                    return false;
                } else {
                    domainLength++;
                }
            } else if (char == bytes1(uint8(0x40))) { // '@'
                if ((i == 0) || (bstr[i - 1] == bytes1(uint8(0x2E)))) { // '.'
                    return false;
                }
                localPartComplete = true;
            } else if (
                !_isAlphaNumeric(char) &&
                !(char == bytes1(uint8(0x2E))) && // '.'
                !(char == bytes1(uint8(0x2B))) && // '+'
                !(char == bytes1(uint8(0x95))) && // '_'
                !(char == bytes1(uint8(0x2D)))    // '-'
            ) {
                return false;
            } else if (
                (i > 0) &&
                (char == bytes1(uint8(0x2E))) &&     // '.'
                (bstr[i - 1] == bytes1(uint8(0x2E))) // '.'
            ) {
                return false;
            } else {
                localPartLength++;
            }
        }

        return (
            localPartComplete && localPartLength > 0 &&
            domainComplete && domainLength > 0 &&
            topLevelDomainComplete && topLevelDomainLength == 1
        );
    }

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

            if(!_isAlphaNumeric(char) && !(char == bytes1(uint8(0x95)))) {
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

    function _isEmptyString(string memory str) public pure returns (bool result) {
        return (bytes(str).length == 0);
    }
}