// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./TwitterData_0_1_0.sol";
import "./TwitterData_0_1_1.sol";

// version 0.1.0
contract TwitterLogic_0_1_1 {
    struct Tweet {
        uint256 id;
        address from;
        bytes32 cid;
        bytes32 gifCid;
        uint256 timestamp;
        uint256 likes;
    }

    address private _owner;

    address private twitter_data_address_0_1_0 = 0xd7B63981A38ACEB507354DF5b51945bacbe28414;
    TwitterData_0_1_0 data_instance_0_1_0;

    address private twitter_data_address_0_1_1 = 0xD4Fc541236927E2EAf8F27606bD7309C1Fc2cbee;
    TwitterData_0_1_1 internal data_instance_0_1_1;

    constructor() {
        _owner = msg.sender;
        data_instance_0_1_0 = TwitterData_0_1_0(twitter_data_address_0_1_0);
        data_instance_0_1_1 = TwitterData_0_1_1(twitter_data_address_0_1_1);
    }

    // Example: 0x0000000000000000000000000000000000000000000068692066726f6d20706e
    function tweet(bytes32 cid, bytes32 gifCID) public {
        uint256 tweetId = data_instance_0_1_0.tweet(msg.sender, cid);
        data_instance_0_1_1.tweet(tweetId, gifCID);
    }

    function getTweet(uint256 tweetId) public view returns (Tweet memory t) {
        (uint256 id, address from, bytes32 cid, uint256 timestamp, uint256 likes) = data_instance_0_1_0.tweets(tweetId);
        (bytes32 gifCid) = data_instance_0_1_1.tweets(tweetId);

        return Tweet(
                    id,
                    from,
                    cid,
                    gifCid,
                    timestamp,
                    likes
                );
    }
}