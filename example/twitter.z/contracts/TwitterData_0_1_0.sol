// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

// version 0.1.0
contract TwitterData_0_1_0 {
    struct Tweet {
        uint256 id;
        address from;
        bytes32 cid;
        uint256 timestamp;
        uint256 likes;
    }

    Tweet[] public tweets;
    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    // Example: 0x0000000000000000000000000000000000000000000068692066726f6d20706e
    function tweet(address sender, bytes32 cid) public returns (uint256) {
        uint256 id = tweets.length;
        Tweet memory _tweet = Tweet(id, sender, cid, block.timestamp, 0);
        tweets.push(_tweet);
        return id;
    }
}