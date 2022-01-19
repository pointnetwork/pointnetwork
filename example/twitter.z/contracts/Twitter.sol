// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Twitter {
    struct Tweet {
        address from;
        bytes32 contents;
        uint256 timestamp;
        uint256 likes;
    }

    Tweet[] tweets;
    mapping(address => Tweet[]) tweetsByOwner;
    address private _owner;
    address private _migrator;

    constructor(address migrator) {
        _owner = msg.sender;
        _migrator = migrator;
    }

    function tweet(bytes32 contents) public {
        Tweet memory _tweet = Tweet(msg.sender, contents, block.timestamp, 0);
        tweets.push(_tweet);
        tweetsByOwner[msg.sender].push(_tweet);
    }

    function like(uint256 tweet_id) public {
        tweets[tweet_id].likes++;
    }

    function getTweet(uint256 tweet_id) view public returns (Tweet memory t) {
        return tweets[tweet_id];
    }

    function getTweetByOwner(address owner, uint256 tweet_id) view public returns (Tweet memory t) {
        return tweetsByOwner[owner][tweet_id];
    }

    function add(address owner, bytes32 contents, uint256 timestamp, uint256 likes) public {
        require(msg.sender == _migrator, "Access Denied");

        Tweet memory _tweet = Tweet({
            from : owner,
            contents : contents,
            timestamp : timestamp,
            likes : likes
        });

        tweets.push(_tweet);
        tweetsByOwner[_tweet.from].push(_tweet);
    }
}
