pragma solidity ^0.5.0;

contract StorageProviderRegistry {
    struct Provider {
        address id;
        string connection;
        uint announced_at;
        address announced_by;
        uint collateral;
    }

    address[] providerIds;
    mapping(address => Provider) providers;

    event Announcement(address id, string connection, uint collateral);

    function announce(string memory connection) payable public {
        address memory id = msg.sender;

        // If there is no record of this provider yet, we need to add its id to the list of all provider ids
        if (providers[id].id == address(0)) providerIds.push(id);

        if (msg.value == 0) revert('No collateral supplied');

        uint memory added_collateral = msg.value;

        Provider memory sp = Provider({
            id: id,
            connection: connection,
            announced_at: block.timestamp,
            announced_by: msg.sender,
            collateral: added_collateral
        });

        if (providers[id].id != address(0)) {
            sp.collateral += providers[id].collateral;
        }

        providers[id] = sp;

        emit Announcement(id, connection, sp.collateral);
    }

//    function get(string memory key) public view returns (string memory value) {
//        return data[key];
//    }
}