// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Twitter {
    struct Tweet {
        address from;
        string contents;
        uint timestamp;
        uint likes;
    }

    Tweet[] tweets;

    function tweet(bytes32 contents) public {
        Tweet memory _tweet = Tweet(msg.sender, contents, block.timestamp, 0);
        tweets.push(_tweet);
    }

    function like(uint tweet_id) public {
        tweets[tweet_id].likes++;
    }

    function getTweet(uint tweet_id) view public returns(Tweet memory t) {
        return tweets[tweet_id];
    }
}