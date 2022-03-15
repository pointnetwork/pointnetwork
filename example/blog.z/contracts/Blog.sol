// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
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

    enum Action {Migrator, Article, Comment}

    event StateChange(
        uint256 articleId,
        address indexed from,
        uint256 indexed date,
        Action indexed action
    );

    Article[] public articles;
    mapping(uint256 => Comment[]) public commentsByArticleId;
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
        emit StateChange(0, msg.sender, block.timestamp, Action.Migrator);
    }

    // Article Functions
    function createArticle(string memory title, bytes32 contents) external {
        uint256 _id = articles.length + 1;
        Article memory _article = Article(
            _id,
            msg.sender,
            title,
            contents,
            block.timestamp
        );
        articles.push(_article);
        emit StateChange(_id, msg.sender, block.timestamp, Action.Article);
    }

    function getArticles() external view returns (Article[] memory) {
        return articles;
    }

    function getArticle(uint256 articleId) external view returns (Article memory)
    {
        return articles[articleId - 1];
    }

    // Comment Functions
    function createCommentByArticle(uint256 articleId, bytes32 contents) external {
        Comment memory _comment = Comment(
            msg.sender,
            contents,
            block.timestamp
        );
        commentsByArticleId[articleId].push(_comment);
        emit StateChange(articleId, msg.sender, block.timestamp, Action.Comment);
    }

    function getCommentsByArticle(uint256 articleId) external view returns (Comment[] memory)
    {
        return commentsByArticleId[articleId];
    }

    function add(uint256 id ,address author ,string memory title ,bytes32 contents ,uint256 timestamp) external {
        require(msg.sender == _migrator, "Access Denied");
        Article memory _article = Article(
            id,
            author,
            title,
            contents,
            timestamp
        );
        articles.push(_article);

        emit StateChange(id, author, timestamp, Action.Article);
    }

    function addComment(uint256 postId,address author ,bytes32 contents,uint256 timestamp) external {
        require(msg.sender == _migrator, "Access Denied");
        require(articles[postId].id != 0, "Invalid article");

        commentsByArticleId[postId].push(
            Comment({
                author: author,
                contents: contents,
                timestamp: timestamp
            })
        );

        emit StateChange(postId, author, timestamp, Action.Comment);
    }
}