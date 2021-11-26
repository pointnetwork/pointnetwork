// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract StorageProviderRegistry {
    using SafeMath for uint256;
    struct Provider {
        address id;
        string connection;
        uint announced_at;
        address announced_by;
        uint collateral;
        uint collateral_lock_period;
        uint cost_per_kb;
    }

    address cheapest_provider;
    address[] providerIds;
    mapping(address => Provider) providers;

    event Announcement(address id, string connection, uint collateral, uint collateral_lock_period, uint cost_per_kb);

    constructor() {
        // Set the provider address to the Raiden node address of that provider and keep the 'connection' property
        // set to the kademlia connection url of the PN node.
        providers[0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1] = Provider({
            id: 0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1,
            connection: 'http://storage_provider:9685/#3c903addcc954b318a5077d0f7bce44a7b9c95b1',
            announced_at: 1613647823,
            announced_by: msg.sender,
            collateral: 50,
            cost_per_kb: 5,
            collateral_lock_period: 500
        });
        cheapest_provider = 0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1;
        providerIds.push(0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1);
    }
    function announce(string memory connection, uint collateral_lock_period, uint cost_per_kb) payable public {
        if (providers[msg.sender].id == address(0)) providerIds.push(msg.sender);

        if (msg.value == 0) revert('No collateral supplied');

        uint added_collateral = msg.value;

        Provider memory sp = Provider({
            id: msg.sender,
            connection: connection,
            announced_at: block.timestamp,
            announced_by: msg.sender,
            collateral: providers[msg.sender].collateral.add(added_collateral),
            cost_per_kb: cost_per_kb,
            collateral_lock_period: providers[msg.sender].collateral_lock_period.add(collateral_lock_period)
        });
        providers[msg.sender] = sp;
        if (cheapest_provider == address(0)) cheapest_provider = msg.sender;
        if (cheapest_provider != address(0) && providers[msg.sender].collateral < providers[cheapest_provider].collateral) cheapest_provider = msg.sender;
        emit Announcement(msg.sender, connection, sp.collateral, sp.collateral_lock_period, sp.cost_per_kb);
    }

//    function get(string memory key) public view returns (string memory value) {
//        return data[key];
//    }

    function getCheapestProvider() public view returns (address result) {
        return cheapest_provider;
    }

    function getAllProviderIds() public view returns (address[] memory){
        return providerIds;
    }

    function getProvider(address provider_id) public view returns (string memory connection, uint cost_per_kb) {
        connection = providers[provider_id].connection;
        cost_per_kb = providers[provider_id].cost_per_kb;
    }
}