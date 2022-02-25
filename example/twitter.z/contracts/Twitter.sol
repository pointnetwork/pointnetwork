// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Twitter {
    struct TweetState {
        uint256 tweetId;
        uint256 likes;
    }

    TweetState[] public states;
    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    event StorageEvent(
        uint256 id,
        bytes32 cid,
        string datatype,
        address sender,
        uint256 blocknumber,
        uint256 timestamp
    );

    // Example: 0x0000000000000000000000000000000000000000000068692066726f6d20706e
    function tweet(bytes32 contents) public {
        uint256 tweetId = states.length;
        TweetState memory _tweetstate = TweetState(tweetId, 0);
        states.push(_tweetstate);
        emit StorageEvent(tweetId, contents, "tweet", msg.sender, block.number, block.timestamp);
    }

    function like(uint256 tweetId) public {
        states[tweetId].likes++;
    }

    // migrate tweet state
    function migrateTweetState(uint256 tweetId, uint256 likes) public {
        require(msg.sender == _owner, "Only owner can migrate.");

        TweetState memory _tweetstate = TweetState(tweetId, likes);
        states.push(_tweetstate);
    }
}
