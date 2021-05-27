// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

contract Blog {
    struct Article {
        string title;
        string contents;
        uint timestamp;
    }

    struct Comment {
        address from;
        uint article_idx;
        string contents;
        uint timestamp;
    }

    address owner;
    Article[] articles;
    Comment[] comments;
    mapping(string => uint) articleAndCommentIdxToCommentIdx;
    mapping(uint => uint) articleCommentCount;

    constructor() public {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert('You are not the owner of this contract');
        _;
    }

    function postArticle(string memory title, string memory contents) onlyOwner public {
        Article memory _article = Article(title, contents, block.timestamp);
        articles.push(_article);
    }

    function postComment(uint article_idx, string memory contents) public {
        Comment memory _comment = Comment(msg.sender, article_idx, contents, block.timestamp);
        comments.push(_comment);

        uint commentIdx = comments.length-1;
        uint articleCommentIdx = articleCommentCount[ article_idx ];
        string memory key = strConcat(uint2str(article_idx), "|", uint2str(articleCommentIdx));
        articleAndCommentIdxToCommentIdx[ key ] = commentIdx;

        articleCommentCount[article_idx]++; // todo: use safemath!
    }

    function getArticle(uint article_idx) view public returns(Article memory a) {
        return articles[article_idx];
    }

    function getArticleComment(uint article_idx, uint article_comment_idx) view public returns(Comment memory c) {
        string memory key = strConcat(uint2str(article_idx), "|", uint2str(article_comment_idx));
        uint comment_idx = articleAndCommentIdxToCommentIdx[ key ];
        return comments[comment_idx];
    }

    // Helpers
    // Taken from https://github.com/provable-things/ethereum-api/blob/master/oraclizeAPI_0.5.sol
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        while (_i != 0) {
            bstr[k--] = byte(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
    function strConcat(string memory _a, string memory _b) internal pure returns (string memory _concatenatedString) {
        return strConcat(_a, _b, "", "", "");
    }
    function strConcat(string memory _a, string memory _b, string memory _c) internal pure returns (string memory _concatenatedString) {
        return strConcat(_a, _b, _c, "", "");
    }
    function strConcat(string memory _a, string memory _b, string memory _c, string memory _d) internal pure returns (string memory _concatenatedString) {
        return strConcat(_a, _b, _c, _d, "");
    }
    function strConcat(string memory _a, string memory _b, string memory _c, string memory _d, string memory _e) internal pure returns (string memory _concatenatedString) {
        bytes memory _ba = bytes(_a);
        bytes memory _bb = bytes(_b);
        bytes memory _bc = bytes(_c);
        bytes memory _bd = bytes(_d);
        bytes memory _be = bytes(_e);
        string memory abcde = new string(_ba.length + _bb.length + _bc.length + _bd.length + _be.length);
        bytes memory babcde = bytes(abcde);
        uint k = 0;
        uint i = 0;
        for (i = 0; i < _ba.length; i++) {
            babcde[k++] = _ba[i];
        }
        for (i = 0; i < _bb.length; i++) {
            babcde[k++] = _bb[i];
        }
        for (i = 0; i < _bc.length; i++) {
            babcde[k++] = _bc[i];
        }
        for (i = 0; i < _bd.length; i++) {
            babcde[k++] = _bd[i];
        }
        for (i = 0; i < _be.length; i++) {
            babcde[k++] = _be[i];
        }
        return string(babcde);
    }

}