// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

contract PointSocial  {
    using Counters for Counters.Counter;
    Counters.Counter internal _postIds;
    Counters.Counter internal _commentIds;
    Counters.Counter internal _likeIds;

    struct Post {
        uint id;
        address from;
        bytes32 contents;
        bytes32 image;
        uint createdAt;
        uint16 likesCount;
        uint16 commentsCount;
    }

    struct Comment {
        uint id;
        address from;
        bytes32 contents;
        uint createdAt;
    }

    struct Like {
        uint id;
        address from;
        uint createdAt;
    }

    Post[] posts;
    mapping(address => Post[]) postsByOwner;
    mapping(uint => Post) postById;
    mapping(uint => Comment[]) commentsByPost;
    mapping(uint => Comment) commentById;
    mapping(address => Comment[]) commentsByOwner;
    mapping(uint => Like[]) likesByPost;

    // Post data functions
    // example bytes32: "0x0000000000000000000000000000000000000000000068692066726f6d20706e", "0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function addPost(bytes32 contents, bytes32 image) public {
        _postIds.increment();
        uint newPostId = _postIds.current();
        Post memory _post = Post(newPostId, msg.sender, contents, image, block.timestamp, 0, 0);
        posts.push(_post);
        postById[newPostId] = _post;
        postsByOwner[msg.sender].push(_post);
    }

    function getAllPosts() public view returns(Post[] memory) {
        Post[] memory _posts = new Post[](posts.length);
        for(uint256 i = 0; i<posts.length; i++) {
            _posts[i] = postById[posts[i].id];
        }
        return _posts;
    }

    function getAllPostsByOwner(address owner) view public returns(Post[] memory) {
        Post[] memory _posts = new Post[](postsByOwner[owner].length);
        for(uint256 i = 0; i<postsByOwner[owner].length; i++) {
            _posts[i] = postById[posts[i].id];
        }
        return _posts;
    }

    function getPostById(uint id) view public returns(Post memory) {
        return postById[id];
    }

    // Comments data functions
    // Example: 1,"0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function addCommentToPost(uint postId, bytes32 contents) public {
        _commentIds.increment();
        uint newCommentId = _commentIds.current();
        Comment memory _comment = Comment(newCommentId, msg.sender, contents, block.timestamp);
        commentsByPost[postId].push(_comment);
        commentById[newCommentId] = _comment;
        commentsByOwner[msg.sender].push(_comment);
        postById[postId].commentsCount += 1;
    }

    function getAllCommentsForPost(uint postId) view public returns(Comment[] memory) {
        return commentsByPost[postId];
    }

    // Likes data functions
    function addLikeToPost(uint postId) public {
        _likeIds.increment();
        uint newLikeId = _likeIds.current();
        Like memory _like = Like(newLikeId, msg.sender, block.timestamp);
        likesByPost[postId].push(_like);
        postById[postId].likesCount += 1;
    }
}