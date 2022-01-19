// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;


contract Blog {

    struct Article {
        uint256 id;
        address author;
        string title;
        bytes32 contents;
        uint256 timestamp;
    }

    struct Comment {
        address author;
        bytes32 contents;
        uint256 timestamp;
    }

    Article[] public articles;
    mapping(uint256 => Comment[]) public commentsByArticleId;
    address private _owner;
    address private _migrator;

    constructor(address migrator) {
        _owner = msg.sender;
        _migrator = migrator;
    }

    // Article Functions
    function createArticle(string memory title, bytes32 contents) public {
        uint256 _id = articles.length + 1;
        Article memory _article = Article(
            _id,
            msg.sender,
            title,
            contents,
            block.timestamp
        );
        articles.push(_article);
    }

    function getArticles() public view returns (Article[] memory) {
        return articles;
    }

    function getArticle(uint256 articleId) public view returns (Article memory)
    {
        return articles[articleId - 1];
    }

    // Comment Functions
    function createCommentByArticle(uint256 articleId, bytes32 contents) public
    {
        Comment memory _comment = Comment(
            msg.sender,
            contents,
            block.timestamp
        );
        commentsByArticleId[articleId].push(_comment);
    }

    function getCommentsByArticle(uint256 articleId) public view returns (Comment[] memory)
    {
        return commentsByArticleId[articleId];
    }

    function add(
        uint256 id,
        address author,
        string memory title,
        bytes32 contents,
        uint256 timestamp
    ) public {
        require(msg.sender == _migrator, "Access Denied");
        Article memory _article = Article(
            id,
            author,
            title,
            contents,
            timestamp
        );
        articles.push(_article);
    }

    function addComments(
        uint256 postId,
        address author,
        bytes32 contents,
        uint256 timestamp
    ) public {
        require(msg.sender == _migrator, "Access Denied");
        require(articles[postId].id != 0, "Invalid article");
        
        commentsByArticleId[postId].push(
            Comment({
                author: author,
                contents: contents,
                timestamp: timestamp
            })
        );
    }
}
