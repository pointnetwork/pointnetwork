// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

contract PointSocial  {
    using Counters for Counters.Counter;
    Counters.Counter internal _statusIds;

    struct Status {
        uint id;
        address from;
        bytes32 contents;
        uint timestamp;
        uint likes;
    }

    // struct Comment {
    //     uint id;
    //     address from;
    //     bytes32 contents;
    //     uint timestamp;
    //     uint likes;
    // }

    Status[] statuses;
    mapping(address => Status[]) statusesByOwner;
    mapping(uint => Status) statusById;
    // mapping(statusId => Comment[]) commentsByStatus;

    // example contents: "0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function addStatus(bytes32 contents) public {
        _statusIds.increment();
        uint256 newStatusId = _statusIds.current();
        Status memory _status = Status(newStatusId, msg.sender, contents, block.timestamp, 0);
        statuses.push(_status);
        statusById[newStatusId] = _status;
        statusesByOwner[msg.sender].push(_status);
    }

    function getAllStatuses() public view returns(Status[] memory) {
        return statuses;
    }

    function getAllStatusesBySender(address sender) view public returns(Status[] memory) {
        return statusesByOwner[sender];
    }

    function getStatusById(uint id) view public returns(Status memory) {
        return statusById[id];
    }
}