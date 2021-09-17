// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

contract PointSocial  {
    Counters.Counter internal _statusIds;

    struct Status {
        uint256 id;
        string title;
    }

    // Status Array
    Status[] statuses;

    constructor() {
        addStatus('I am feeling good today');
        addStatus('I am even better now!');
    }

    function addStatus(string memory title) public {
        _statusIds.increment();
        uint256 newStatusId = _statusIds.current();
        Status memory _status = Status(newStatusId, title);
        statuses.push(_status);
    }

    function getStatuses() public view returns(Status[] memory) {
        return statuses;
    }
}