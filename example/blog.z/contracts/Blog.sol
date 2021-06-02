// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Blog {
  struct Article {
    uint id;
    address author;
    string title;
    bytes32 contents;
    uint timestamp;
  }

  struct Comment {
    address author;
    bytes32 contents;
    uint timestamp;
  }

  Article[] articles;
  mapping(uint=>Comment[]) commentsByArticleId;

  // Article Functions
  function createArticle(string memory title, bytes32 contents) public {
    uint _id = articles.length + 1;
    Article memory _article = Article(_id, msg.sender, title, contents, block.timestamp);
    articles.push(_article);
  }

  function getArticles() public view returns(Article[] memory) {
    return articles;
  }

  function getArticle(uint articleId) public view returns(Article memory) {
    return articles[articleId - 1];
  }

  // Comment Functions
  function createCommentByArticle(uint articleId, bytes32 contents) public {
    Comment memory _comment = Comment(msg.sender, contents, block.timestamp);
    commentsByArticleId[articleId].push(_comment);
  }
  function getCommentsByArticle(uint articleId) public view returns(Comment[] memory) {
    return commentsByArticleId[articleId];
  }

}