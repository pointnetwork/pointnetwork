// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Identity is Initializable, UUPSUpgradeable, OwnableUpgradeable{
    struct PubKey64 {
        bytes32 part1;
        bytes32 part2;
    }

    mapping(string => address) public identityToOwner;
    mapping(address => string) public ownerToIdentity;
    mapping(string => mapping(string => string)) public ikv;
    mapping(string => string[]) public ikvList;
    // At the same time this mapping is used to see if the identity is registered at all
    mapping(string => string) public lowercaseToCanonicalIdentities;
    mapping(string => PubKey64) public identityToCommPublicKey;
    string[] public identityList;
    bool public migrationApplied;

    uint private MAX_HANDLE_LENGTH;

    mapping(string => mapping(address => bool)) private _isIdentityDeployer;
    address private oracleAddress;
    bool private devMode;


    event IdentityRegistered(string handle, address identityOwner, PubKey64 commPublicKey);
    event IdentityOwnershipTransferred(
        string indexed handle, 
        address indexed oldOwner, 
        address indexed newOwner, 
        uint256 date
    );
    event IKVSet(string identity, string key, string value, string version);

    event IdentityDeployerChanged(string identity, address deployer, bool allowed);
    
    function initialize() public initializer onlyProxy{
        __Ownable_init();
        __UUPSUpgradeable_init();
        migrationApplied = false;
        MAX_HANDLE_LENGTH = 16;
        oracleAddress = 0x8E2Fb20C427b54Bfe8e529484421fAE41fa6c9f6;
        devMode = false;
    }

    function setMaxHandleLength(uint value) public onlyOwner {
        MAX_HANDLE_LENGTH = value;
    }

    function getMaxHandleLength() public view returns (uint) {
        return MAX_HANDLE_LENGTH;
    }

    function setOracleAddress(address addr) public onlyOwner {
        oracleAddress = addr;
    }

    function getOracleAddress() public view returns (address) {
        return oracleAddress;
    }

    function setDevMode(bool value) public onlyOwner {
        devMode = value;
    }

    function getDevMode() public view returns (bool) {
        return devMode;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier onlyIdentityOwner(string memory identity) {

        require(msg.sender == getOwnerByIdentity(identity), "You are not the owner of this identity");
        // todo: identityToOwner[identity] == address(0) ?
        _;
    }

    modifier onlyIdendityDeployer(string memory identity) {
        require(msg.sender == getOwnerByIdentity(identity) || 
                _isIdentityDeployer[identity][msg.sender] == true, "You are not deployer of this identity");
        _;
    }

    modifier onlyBeforeMigrations() {

        require(migrationApplied == false, "Access denied");
        _;
    }

    function registerVerified(
        string calldata handle, 
        address identityOwner, 
        bytes32 commPublicKeyPart1, 
        bytes32 commPublicKeyPart2,
        bytes32 _hashedMessage, 
        uint8 _v, 
        bytes32 _r, 
        bytes32 _s) public{

        _validateIdentity(handle, identityOwner, false);

        // Check oracle msg for confirming  hat identity can be registered.
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(abi.encodePacked(prefix, _hashedMessage));
        address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
        require(signer == oracleAddress, "Identity claim msg must be signed by the oracle");

        bytes32 expectedMsgFree = keccak256(abi.encodePacked(_toLower(handle), "|", Strings.toHexString(uint256(uint160(identityOwner)), 20), "|free"));
        bytes32 expectedMsgTaken = keccak256(abi.encodePacked(_toLower(handle), "|", Strings.toHexString(uint256(uint160(identityOwner)), 20), "|taken"));

        require(_hashedMessage == expectedMsgFree || _hashedMessage == expectedMsgTaken, "Invalid identity claim msg");

        //ok, go for registering.
        PubKey64 memory commPublicKey = PubKey64(commPublicKeyPart1, commPublicKeyPart2);

        _selfReg(handle, identityOwner, commPublicKey);
    }

    function _validateIdentity(string calldata handle, address identityOwner, bool ynet) private view returns (bool){
        
        if(ynet == true){
            require(keccak256(abi.encodePacked(_toLower(handle[0:5]))) == keccak256(abi.encodePacked("ynet_")),
            "ynet handles must start with ynet_");
        }

        if(migrationApplied == true){
            require(msg.sender == identityOwner, "Cannot register identities for other address than sender");
        }

        if (!_isValidHandle(handle)) revert("Only alphanumeric characters and an underscore allowed");

        // Check if the identity is already registered
        string memory lowercase = _toLower(handle);
        if (!_isEmptyString(lowercaseToCanonicalIdentities[lowercase])) { 
            revert("This identity has already been registered");
        }

        if(migrationApplied == true){
            // Check if this owner already has an identity attached
            if (!_isEmptyString(ownerToIdentity[identityOwner])) revert("This owner already has an identity attached");
        }

        return true;
    }

    function register(
        string calldata handle, 
        address identityOwner, 
        bytes32 commPublicKeyPart1, 
        bytes32 commPublicKeyPart2
        ) public {
        
        _validateIdentity(handle, identityOwner, !devMode);
        
        //ok, go for registering.
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
    function ikvPut(string memory identity, string memory key, string memory value, string memory version) public 
        onlyIdendityDeployer(identity) {
        ikvSet(identity,key,value,version);
    }
    
    function ikvImportKV(string memory identity, string memory key, string memory value, string memory version) public 
        onlyBeforeMigrations() {
        ikvSet(identity,key,value,version);
    }

    function ikvGet(string memory identity, string memory key) public view returns (string memory value) {
        return ikv[identity][key];
    } 

    function finishMigrations() external {
        migrationApplied = true;
        MAX_HANDLE_LENGTH = 16;
    }

    function transferIdentityOwnership(string memory handle, address newOwner) public onlyIdentityOwner(handle) {
        require(newOwner != address(0), "Can't transfer ownership to address 0"); 
        require(newOwner != msg.sender, "Can't transfer ownership to same address"); 
        require(bytes(ownerToIdentity[newOwner]).length == 0, "Owner already has a handle.");

        address oldOwner = msg.sender;
        
        delete ownerToIdentity[oldOwner];

        identityToOwner[handle] = newOwner;
        ownerToIdentity[newOwner] = handle;

        emit IdentityOwnershipTransferred(handle, oldOwner, newOwner, block.timestamp);
    }

    function addIdentityDeployer(string memory handle, address deployer) public onlyIdentityOwner(handle) {
        require(deployer != address(0), "Can't set address 0 as deployer"); 
        require(deployer != getOwnerByIdentity(handle), "Owner is already a deployer");
        require(_isIdentityDeployer[handle][deployer] != true, "Address is already a deployer");

        _isIdentityDeployer[handle][deployer] = true;

        emit IdentityDeployerChanged(handle, deployer, true);
    }

    function removeIdentityDeployer(string memory handle, address deployer) public onlyIdentityOwner(handle) {
        require(deployer != address(0), "Can't remove address 0 as deployer");
        require(deployer != getOwnerByIdentity(handle), "Owner can't be removed as a deployer");
        require(_isIdentityDeployer[handle][deployer] == true, "Address is not a deployer");

        _isIdentityDeployer[handle][deployer] = false;

        emit IdentityDeployerChanged(handle, deployer, false);
    }

    function isIdentityDeployer(string memory handle, address deployer) public view returns (bool){
        if(deployer == getOwnerByIdentity(handle)){
            return true;
        }
        return _isIdentityDeployer[handle][deployer];
    }


    //*** Internal functions ***//
    function _isValidChar(bytes1 char) internal pure returns (bool) {

        return (
            (char >= bytes1(uint8(0x30)) && char <= bytes1(uint8(0x39))) || // 9-0
            (char >= bytes1(uint8(0x41)) && char <= bytes1(uint8(0x5A))) || // A-Z
            (char >= bytes1(uint8(0x61)) && char <= bytes1(uint8(0x7A))) || // a-z
            (char == bytes1(uint8(0x5f))) // '_' 
        );
    }

    function _isValidHandle(string memory str) internal view returns (bool) {

        bytes memory b = bytes(str);
        if (b.length > MAX_HANDLE_LENGTH) return false;

        for (uint i; i < b.length; i++) {
            bytes1 char = b[i];

            if (!_isValidChar(char)) {
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

    function ikvSet(string memory identity, string memory key, string memory value, string memory version) internal {
        if (bytes(ikv[identity][key]).length == 0) {
            ikvList[identity].push(key);
        }

        ikv[identity][key] = value;

        emit IKVSet(identity, key, value, version);
    }
}
