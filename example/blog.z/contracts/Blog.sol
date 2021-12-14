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
  address private _owner;

  constructor() {
    _owner = msg.sender;
    articles.push(Article({
      id: 1,
      author: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
      title: 'Introduction to Point Network',
      contents: 0x3a290284b0c06d7361a5120740744323b93b3a5d7ae731b3c6d35deb11d1f66c,
      timestamp: 1634069607
    }));
    articles.push(Article({
      id: 2,
      author: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
      title: 'Hello mate!',
      contents: 0x6787a405a6ceb7af7c0b47226a012c63c7be4bc8aa0c8f31e2caebee02387652,
      timestamp: 1634069889
    }));
    articles.push(Article({
      id: 3,
      author: 0x8834C336ea54f164fE7D797B5aa2d0Cc65c3EF3a,
      title: 'Blockchain',
      contents: 0x54e183cbf9bfd1c6093409b7f2c85ae3a7d2b7b8785e81064e7cdf640f9962d3,
      timestamp: 1634230699
    }));
    articles.push(Article({
      id: 4,
      author: 0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
      title: 'hello',
      contents: 0x8452c9b9140222b08593a26daa782707297be9f7b3e8281d7b4974769f19afd0,
      timestamp: 1634284277
    }));
    articles.push(Article({
      id: 5,
      author: 0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
      title: 'MyFirstBlog',
      contents: 0x91573e7700c534ec1908581a69b5bec707545659335667bf69b0e909613aed23,
      timestamp: 1634285577
    }));
  }

  function _init(uint i) public {
    require(msg.sender == _owner, "Access denied");
    if (i == 1) {
      commentsByArticleId[1].push(Comment({
        author: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
        contents: 0x7f93b7bfb222e5359c88b90fede3ff836fe00985da1d43e816ec3fb017f457eb,
        timestamp: 1634069612
      }));
      commentsByArticleId[1].push(Comment({
        author: 0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
        contents: 0xfd05fa78b1e81552ec31cd868ce290f5bbbe51989ecd8a3289c0e00c8c47536e,
        timestamp: 1634239293
      }));
      commentsByArticleId[1].push(Comment({
        author: 0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
        contents: 0x9c0cf4bc6b1481c3a5734ede86a28c651f43d4d86dd9069d77b0cff418d688f0,
        timestamp: 1634284371
      }));
      commentsByArticleId[1].push(Comment({
        author: 0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
        contents: 0x24fc6cb46b332a217bc28c18ef6f2d3a30eafdebd3ab511c204ee0f7d67c29a4,
        timestamp: 1634294741
      }));
    }

    if (i == 2) {
      commentsByArticleId[2].push(Comment({
        author: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
        contents: 0x56198ab76c43959b7ca93267ae9865c44e24168f648508ebd55e93b7f55cfdac,
        timestamp: 1634070111
      }));
      commentsByArticleId[2].push(Comment({
        author: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
        contents: 0xfd05fa78b1e81552ec31cd868ce290f5bbbe51989ecd8a3289c0e00c8c47536e,
        timestamp: 1634120467
      }));
      commentsByArticleId[2].push(Comment({
        author: 0x2661442C0E46FED6FaF6683B6Ba033983244c1F1,
        contents: 0x1f70a48eff3a14f15bc957815f935dc1572621760ceaf5a9d475a9763de3a5f4,
        timestamp: 1634122708
      }));
      commentsByArticleId[2].push(Comment({
        author: 0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
        contents: 0xe62837006bcf30c0ceef571b7f6e1876ac6fe8a42c7b3ae32b5785a00c5effff,
        timestamp: 1634240027
      }));
      commentsByArticleId[2].push(Comment({
        author: 0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
        contents: 0xfb33f3721c8872da894562938dd75be30ce0f20807fb38e15c2d2d4a9be2dc34,
        timestamp: 1634284481
      }));
      commentsByArticleId[2].push(Comment({
        author: 0x64c4240e082879C7B8CC39a1bF0f7801321B18cA,
        contents: 0xb55b8414bfa8df1761541efd19014692b04e248fcfa627e23a2fd925ec2e1727,
        timestamp: 1634588401
      }));
    }
  }

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
