// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

contract Twitter {
    struct Tweet {
        address from;
        bytes32 contents;
        uint256 timestamp;
        uint256 likes;
    }

    enum Action {Migrator, Tweet, Like}

    event StateChange(
        address indexed from,
        uint256 indexed date,
        Action indexed action
    );

    Tweet[] public tweets;
    mapping(address => Tweet[]) public tweetsByOwner;
    address private _owner;
    address private _migrator;

    constructor() {
        _owner = msg.sender;
    }

    function addMigrator(address migrator) external {
        require(migrator != address(0), "Access Denied");
        require(msg.sender == _owner, "Access Denied");
        require(_migrator == address(0), "Access Denied");
        _migrator = migrator;
        emit StateChange(msg.sender, block.timestamp, Action.Migrator);
    }

    function tweet(bytes32 contents) external {
        Tweet memory _tweet = Tweet(msg.sender, contents, block.timestamp, 0);
        tweets.push(_tweet);
        tweetsByOwner[msg.sender].push(_tweet);
        emit StateChange(msg.sender, block.timestamp, Action.Tweet);
    }

    function like(uint256 tweetId) external {
        tweets[tweetId].likes++;
        emit StateChange(msg.sender, block.timestamp, Action.Like);
    }

    function getTweet(uint256 tweetId) external view returns (Tweet memory t) {
        return tweets[tweetId];
    }

    function getTweetByOwner(address owner, uint256 tweetId) external view returns (Tweet memory t) {
        return tweetsByOwner[owner][tweetId];
    }

    function add(address owner, bytes32 contents, uint256 timestamp, uint256 likes) external {
        require(msg.sender == _migrator, "Access Denied");

        Tweet memory _tweet = Tweet({
            from : owner,
            contents : contents,
            timestamp : timestamp,
            likes : likes
        });

        tweets.push(_tweet);
        tweetsByOwner[_tweet.from].push(_tweet);
        emit StateChange(owner, timestamp, Action.Tweet);
    }
}
