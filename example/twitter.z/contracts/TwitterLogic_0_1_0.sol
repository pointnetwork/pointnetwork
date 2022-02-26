// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./TwitterData_0_1_0.sol";

// version 0.1.0
contract TwitterLogic_0_1_0 {
    struct Tweet {
        uint256 id;
        address from;
        bytes32 cid;
        uint256 timestamp;
        uint256 likes;
    }

    address private _owner;

    address private twitter_data_address_0_1_0 = 0x417Bf7C9dc415FEEb693B6FE313d1186C692600F;
    TwitterData_0_1_0 data_instance_0_1_0;

    constructor() {
        _owner = msg.sender;
        data_instance_0_1_0 = TwitterData_0_1_0(twitter_data_address_0_1_0);
    }

    // Example: 0x0000000000000000000000000000000000000000000068692066726f6d20706e
    function tweet(bytes32 cid) public {
        data_instance_0_1_0.tweet(msg.sender, cid);
    }

    function getTweet(uint256 tweetId) public view returns (Tweet memory t) {
        (uint256 id, address from, bytes32 cid, uint256 timestamp, uint256 likes) = data_instance_0_1_0.tweets(tweetId);

        return Tweet(
                    id,
                    from,
                    cid,
                    timestamp,
                    likes
                );
    }
}