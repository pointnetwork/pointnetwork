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

    Status[] statuses;
    mapping(address => Status[]) statusesByOwner;

    function addStatus(bytes32 contents) public {
        _statusIds.increment();
        uint256 newStatusId = _statusIds.current();
        Status memory _status = Status(newStatusId, msg.sender, contents, block.timestamp, 0);
        statuses.push(_status);
        statusesByOwner[msg.sender].push(_status);
    }

    function getAllStatuses() public view returns(Status[] memory) {
        return statuses;
    }

    function getAllStatusesBySender(address sender) view public returns(Status[] memory) {
        return statusesByOwner[sender];
    }
}