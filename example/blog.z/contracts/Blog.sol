// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

contract Blog {
  struct Article {
    address author;
    string title;
    string contents;
    uint timestamp;
  }

  struct Comment {
    address author;
    string content;
    uint timestamp;
  }

  Article[] articles;
  mapping(uint=>Comment[]) commentsByArticleId;

  // Article Functions
  function createArticle(string memory title, string memory contents) public {
    Article memory _article = Article(msg.sender, title, contents, block.timestamp);
    articles.push(_article);
  }

  function getArticles() public view returns(Article[] memory) {
    return articles;
  }

  function getArticle(uint articleId) public view returns(Article memory) {
    return articles[articleId];
  }

  // Comment Functions
  function createCommentByArticle(uint articleId, string memory contents) public {
    Comment memory _comment = Comment(msg.sender, contents, block.timestamp);
    commentsByArticleId[articleId].push(_comment);
  }
  function getCommentsByArticle(uint articleId) public view returns(Comment[] memory) {
    return commentsByArticleId[articleId];
  }

}