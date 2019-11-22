pragma solidity ^0.5.0;

contract StorageProviderRegistry {
    struct Provider {
        address id;
        string connection;
        uint announced_at;
        uint collateral;
    }

    address[] providerIds;
    mapping(address => Provider) providers;

    event Announcement(address id, string connection, uint collateral);

    function announce(address id, string memory connection) payable public {
        if (providers[id].id == address(0)) providerIds.push(id);

        if (msg.value == 0) revert('No collateral');

        uint collateral = msg.value;

        Provider memory sp = Provider({
            id: id,
            connection: connection,
            announced_at: block.timestamp,
            collateral: collateral // todo: add instead of rewriting if exists
        });
        providers[id] = sp;

        emit Announcement(id, connection, sp.collateral);
    }

//    function get(string memory key) public view returns (string memory value) {
//        return data[key];
//    }
}