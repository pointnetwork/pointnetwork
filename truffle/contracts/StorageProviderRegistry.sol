// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0 <0.8.0;
import "@openzeppelin/contracts/math/SafeMath.sol";

contract StorageProviderRegistry {
    using SafeMath for uint256;
    struct Provider {
        address id;
        string connection;
        uint collateral;
        uint collateral_lock_period;
        uint cost_per_kb;
        uint announced_at;
    }

    address cheapest_provider;
    address[] providerIds;
    mapping(address => Provider) providers;

    event Announcement(address id, string connection, uint collateral, uint collateral_lock_period, uint cost_per_kb);

    constructor() {
        // Some initial domains for the demos, you can add your own, or better yet, register through normal means
        providers[0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301] = Provider({
            id: 0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301,
            connection: 'http://127.0.0.1:12345/#c01011611e3501c6b3f6dc4b6d3fe644d21ab301',
            announced_at: 1613647823,
            collateral: 50,
            cost_per_kb: 5,
            collateral_lock_period: 500
        });
        cheapest_provider = 0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301;
        providerIds.push(0xC01011611e3501C6b3F6dC4B6d3FE644d21aB301);
    }
    function announce(string memory connection, uint collateral_lock_period, uint cost_per_kb) payable public {
        if (providers[msg.sender].id == address(0)) providerIds.push(msg.sender);

        if (msg.value == 0) revert('No collateral');

        uint collateral = msg.value;

        Provider memory sp = Provider({
            id: msg.sender,
            connection: connection,
            announced_at: block.timestamp,
            collateral: providers[msg.sender].collateral.add(collateral),
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

    function readCheapestProvider() public view returns (address result) {
        return cheapest_provider;
    }

    function readAllProviders() public view returns (address[] memory){
        return providerIds;
    }

    function getProvider(address provider_id) public view returns (string memory connection, uint cost_per_kb) {
        connection = providers[provider_id].connection;
        cost_per_kb = providers[provider_id].cost_per_kb;
    }
}