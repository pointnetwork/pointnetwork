// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// version 0.1.1
contract TwitterData_0_1_1 {
    struct Tweet {
        bytes32 gifCid;
    }

    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    mapping(uint256 => Tweet) public tweets;

    // Example: 0x0000000000000000000000000000000000000000000068692066726f6d20706e
    function tweet(uint256 id, bytes32 gifCid) public {
        Tweet memory _tweet = Tweet(gifCid);
        tweets[id] = _tweet;
    }
}