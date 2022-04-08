// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

contract Sms {
    struct Tweet {
        uint256 id;
        address from;
        bytes32 contents;
        uint256 timestamp;
        uint256 likes;
    }

    enum Action {Migrator, Tweet, Like}

    event StateChange(
        uint256 tweetId,
        address indexed from,
        uint256 indexed date,
        Action indexed action
    );

    uint256[] public tweetIds;

    mapping(uint256 => Tweet) public tweets;
    mapping(address => uint256[]) public tweetIdsByOwner;

    address private _owner;
    address private _migrator;

    modifier tweetExists(uint256 tweetId) {
      require(tweets[tweetId].from != address(0x0), "Tweet not found");
      _;
    }

    constructor() {
        _owner = msg.sender;
    }

    // "0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function tweet(bytes32 contents) external {
        uint256 _id = tweetIds.length;
        Tweet memory _tweet = Tweet(_id, msg.sender, contents, block.timestamp, 0);
        tweets[_id] = _tweet;
        tweetIdsByOwner[msg.sender].push(_id);
        tweetIds.push(_id);
        emit StateChange(_id, msg.sender, block.timestamp, Action.Tweet);
    }

    function like(uint256 tweetId) external tweetExists(tweetId) {
        tweets[tweetId].likes++;
        emit StateChange(tweetId, msg.sender, block.timestamp, Action.Like);
    }

    function getTweet(uint256 tweetId) external view tweetExists(tweetId) returns (Tweet memory t) {
        return tweets[tweetId];
    }

    function getTweetIdsByOwner(address owner) external view returns (uint256[] memory ids) {
        return tweetIdsByOwner[owner];
    }

    function getTweetsByOwner(address owner) external view returns (Tweet[] memory ownerTweets) {
        uint256 count = tweetIdsByOwner[owner].length;
        Tweet[] memory _tweeetsByOwner = new Tweet[](count);
        for(uint256 i = 0; i < count; i++) {
            Tweet memory _tweet = tweets[tweetIdsByOwner[owner][i]];
            _tweeetsByOwner[i] = _tweet;
        }
        return _tweeetsByOwner;
    }

    // migrator functions
    function addMigrator(address migrator) external {
        require(migrator != address(0), "Access Denied");
        require(msg.sender == _owner, "Access Denied");
        require(_migrator == address(0), "Access Denied");
        _migrator = migrator;
        emit StateChange(0, msg.sender, block.timestamp, Action.Migrator);
    }

    function add(address owner, bytes32 contents, uint256 timestamp, uint256 likes) external {
        require(msg.sender == _migrator, "Access Denied");

        uint256 _id = tweetIds.length;

        Tweet memory _tweet = Tweet({
            id : _id,
            from : owner,
            contents : contents,
            timestamp : timestamp,
            likes : likes
        });

        tweets[_id] = _tweet;
        tweetIdsByOwner[msg.sender].push(_id);
        tweetIds.push(_id);

        emit StateChange(_id, owner, timestamp, Action.Tweet);
    }
}
