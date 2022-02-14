// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract StorageProviderRegistry {
    using SafeMath for uint256;
    struct Provider {
        address id;
        string connection;
        uint announcedAt;
        address announcedBy;
        uint collateral;
        uint collateralLockPeriod;
        uint costPerKb;
    }

    address public cheapestProvider;
    address[] public providerIds;
    mapping(address => Provider) public providers;

    event Announcement(address id, string connection, uint collateral, uint collateralLockPeriod, uint costPerKb);

    constructor() {
        // Set the provider address to the Raiden node address of that provider and keep the 'connection' property
        // set to the kademlia connection url of the PN node.
        providers[0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1] = Provider({
            id: 0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1,
            connection: "http://storage_provider:9685/#3c903addcc954b318a5077d0f7bce44a7b9c95b1",
            announcedAt: 1613647823,
            announcedBy: msg.sender,
            collateral: 50,
            costPerKb: 5,
            collateralLockPeriod: 500
        });
        cheapestProvider = 0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1;
        providerIds.push(0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1);
    }
    function announce(string memory connection, uint collateralLockPeriod, uint costPerKb) public payable {
        if (providers[msg.sender].id == address(0)) providerIds.push(msg.sender);

        if (msg.value == 0) revert("No collateral supplied");

        uint addedCollateral = msg.value;

        Provider memory sp = Provider({
            id: msg.sender,
            connection: connection,
            announcedAt: block.timestamp,
            announcedBy: msg.sender,
            collateral: providers[msg.sender].collateral.add(addedCollateral),
            costPerKb: costPerKb,
            collateralLockPeriod: providers[msg.sender].collateralLockPeriod.add(collateralLockPeriod)
        });
        providers[msg.sender] = sp;
        if (cheapestProvider == address(0)) cheapestProvider = msg.sender;

        
        if (cheapestProvider != address(0) && 
            providers[msg.sender].collateral < providers[cheapestProvider].collateral) { 
            cheapestProvider = msg.sender;
        }
        emit Announcement(msg.sender, connection, sp.collateral, sp.collateralLockPeriod, sp.costPerKb);
    }

//    function get(string memory key) public view returns (string memory value) {
//        return data[key];
//    }

    function getCheapestProvider() public view returns (address result) {
        return cheapestProvider;
    }

    function getAllProviderIds() public view returns (address[] memory){
        return providerIds;
    }

    function getProvider(address providerId) public view returns (string memory connection, uint costPerKb) {
        connection = providers[providerId].connection;
        costPerKb = providers[providerId].costPerKb;
    }
}