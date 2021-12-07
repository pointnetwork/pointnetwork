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

    constructor() {
        // Posts
        Post[14] memory _posts = [Post({
            id: 1,
            from: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
            contents: 0x0a06675482e75ca68ff9624b72f49ca547247ddfe108ef35dbe60a42f0b61a10,
            image: 0x7213abf7636dc13dc7f5b1135e13b209b022e04f4f62559e5a6096ea85a1108d,
            createdAt: 1634132287,
            likesCount: 2,
            commentsCount: 1
        }),
        Post({
            id: 2,
            from: 0x2d5360AAb543E92efc40B438b813f0FD5fa64620,
            image: 0x0000000000000000000000000000000000000000000000000000000000000000,
            contents: 0xecd0e108a98e192af1d2c25055f4e3bed784b5c877204e73219a5203251feaab,
            createdAt: 1634221707,
            likesCount: 0,
            commentsCount: 0
        }),
        Post({
            id: 3,
            from: 0x2d5360AAb543E92efc40B438b813f0FD5fa64620,
            contents: 0x921317564aafceb78d5b16dd89949367ba437239a9a19d91dff9d8f4a3107ea7,
            image: 0x3ee31da5a31f7e9d67bdd41517aaabe237624960db61cdc1ab3f6a05f9a98292,
            createdAt: 1634222732,
            likesCount: 0,
            commentsCount: 0
        }),
        Post({
            id: 4,
            from: 0x574318Fc15C6Db801dC4719D4f746acF79FfC3cf,
            contents: 0x6cf5c64617ed2471496447abd8b905c620046c732f00e965f287421dfb94d91b,
            image: 0x0000000000000000000000000000000000000000000000000000000000000000,
            createdAt: 1634230250,
            likesCount: 0,
            commentsCount: 0
        }),
        Post({
            id: 5,
            from: 0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
            contents: 0xfd41d877049c14922ac693b7bda78e7d654f8e3c2349a2bebdcb8d760841035c,
            image: 0x0000000000000000000000000000000000000000000000000000000000000000,
            createdAt: 1634237758,
            likesCount: 0,
            commentsCount: 1
        }),
        Post({
            id: 6,
            from: 0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
            contents: 0x76faf88b7826ce189618d5f47a9f2cbd5e55e3955e1d74d1214c3fb7a4920690,
            image: 0x6c4a6295f7c6d5424f9c54b63ba9489041aa59bdb2ad3eef3f0cb39ae6b7d881,
            createdAt: 1634285355,
            likesCount: 1,
            commentsCount: 1
        }),
        Post({
            id: 7,
            from: 0x8834C336ea54f164fE7D797B5aa2d0Cc65c3EF3a,
            contents: 0x232e2460af818d3b74b09442a231ddafc42ffa8f18be79635b5914d30aa4c891,
            image: 0x4183c05988d8ab913496336fef89c528c69bce2025e50437abe64466fd605222,
            createdAt: 1634288596,
            likesCount: 4,
            commentsCount: 0
        }),
        Post({
            id: 8,
            from: 0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
            contents: 0x52695c9ee40d6ad09b765bd0bd892ca78a7047eca22b208d15d5ae74f60badfa,
            image: 0x587155d7b480d656de2bb91aa9090778a4a750c5bb280d2c02614a06bb4f04ff,
            createdAt: 1634293825,
            likesCount: 0,
            commentsCount: 0
        }),
        Post({
            id: 9,
            from: 0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
            contents: 0x4c323b6cbe739a806c81b824a2ac8fcd80c5ea20f1062b4a41d4ac6e50f3ef04,
            image: 0x587155d7b480d656de2bb91aa9090778a4a750c5bb280d2c02614a06bb4f04ff,
            createdAt: 1634294254,
            likesCount: 3,
            commentsCount: 0
        }),
        Post({
            id: 10,
            from: 0xEc8bAaaAf82170f06c6E7e937a7e37c1DAffA45c,
            contents: 0xb0936212a42ae1bcb48204eaf01975988e9948b0721fe169766629088fd399ca,
            image: 0x0000000000000000000000000000000000000000000000000000000000000000,
            createdAt: 1634362182,
            likesCount: 1,
            commentsCount: 0
        }),
        Post({
            id: 11,
            from: 0xb17315291626773aeb5F6B4B4d4FAaacf4B5bc6a,
            contents: 0xb24b8538401c033fa3d1c57db7e871c69f7bd4fa3c1a7fd622cc6de1e6cb7925,
            image: 0x0000000000000000000000000000000000000000000000000000000000000000,
            createdAt: 1634364174,
            likesCount: 0,
            commentsCount: 0
        }),
        Post({
            id: 12,
            from: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
            contents: 0xc623ff98cfa1504709cfb6be7a6b3e1ef383781accacbba8bc365df9bfa0869f,
            image: 0xccb5e944d8ca7899949d416d200c3ce111ac36a2b6e85414cec6f93f3353e698,
            createdAt: 1634574080,
            likesCount: 0,
            commentsCount: 0
        }),
        Post({
            id: 13,
            from: 0xCCb4D3509443B7b6Fe1e2c27FB61dC3D635E3088,
            contents: 0x6f7eb7a9eed0eb4e8660144071820fe18e4597c647af6fdca5a14063b08e0f6c,
            image: 0x0000000000000000000000000000000000000000000000000000000000000000,
            createdAt: 1635428005,
            likesCount: 0,
            commentsCount: 0
        }),
        Post({
            id: 14,
            from: 0x6535DfCAe615068e58d3B96F85b72BD738234e02,
            contents: 0x2eaa56ca1b61daea9a3a13ac9f37ade2859c292d003f45546a2df3b0ec262a86,
            image: 0x0000000000000000000000000000000000000000000000000000000000000000,
            createdAt: 1635530735,
            likesCount:  0,
            commentsCount: 0
        })];

        for (uint i = 0; i < 14; i++) {
            _postIds.increment();
            posts.push(_posts[i]);
            postsByOwner[_posts[i].from].push(_posts[i]);
            postById[_posts[i].id] = _posts[i];
        }

        // comment 1 on post 1
        _commentIds.increment();
        Comment memory comment1 = Comment({
            id: 1,
            from: 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
            contents: 0xb87a664b88b76657f5e91ca6a50af72c2d27d2949fc85fd07528fdf0298d5953,
            createdAt: 1634132804
        });
        commentsByPost[1].push(comment1);
        // commentById[comment1.id] = comment1;
        // commentsByOwner[comment1.from].push(comment1);

        // comment 2 on post 5
        // _commentIds.increment();
        // commentsByPost[5].push(Comment({
        //     id: 2,
        //     from: 0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
        //     contents: 0xd8f4902ce8afaab5381cca38732a6cc4b784dfae7735c0efdcc1ed58ab70fcad,
        //     createdAt: 1634284869
        // }));
        // // commentById[comment2.id] = comment2;
        // // commentsByOwner[comment2.from].push(comment2);


        // comment 3 on post 6
        // _commentIds.increment();
        // commentsByPost[6].push(Comment({
        //     id: 3,
        //     from: 0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
        //     contents: 0x873a1dcee5a00bb350f24e0cdfcbcc1d34144abe8dde37a5ff67ed3a1f5cd534,
        //     createdAt: 1634294379
        // }));
        // commentById[comment3.id] = comment3;
        // commentsByOwner[comment3.from].push(comment3);
    }

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
            _posts[i] = postById[postsByOwner[owner][i].id];
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