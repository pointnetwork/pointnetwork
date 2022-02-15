// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract BlogMigrations {
    address private _owner;
    address private _migrator;


    constructor() {
        _owner = msg.sender;
    }


    function migrate(address _contract) public {
        require(msg.sender == _owner, "Access Denied");

        string memory sig = "add(uint256,address,string,bytes32,uint256)";

        _contract.call(
            abi.encodeWithSignature(
                sig,
                1,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                "Introduction to Point Network",
                0x3a290284b0c06d7361a5120740744323b93b3a5d7ae731b3c6d35deb11d1f66c,
                1634069607
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                2,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                "Hello mate!",
                0x6787a405a6ceb7af7c0b47226a012c63c7be4bc8aa0c8f31e2caebee02387652,
                1634069889
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                3,
                0x8834C336ea54f164fE7D797B5aa2d0Cc65c3EF3a,
                "Blockchain",
                0x54e183cbf9bfd1c6093409b7f2c85ae3a7d2b7b8785e81064e7cdf640f9962d3,
                1634230699
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                4,
                0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
                "hello",
                0x8452c9b9140222b08593a26daa782707297be9f7b3e8281d7b4974769f19afd0,
                1634284277
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                5,
                0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
                "MyFirstBlog",
                0x91573e7700c534ec1908581a69b5bec707545659335667bf69b0e909613aed23,
                1634285577
            )
        );

        persistComments(_contract);
    }

    function persistComments(address _contract) internal {
        string memory sig = "addComments(uint256,address,bytes32,uint256)";
        uint256 fistPost = 1;
        uint256 secondPost = 2;
    
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                fistPost,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0x7f93b7bfb222e5359c88b90fede3ff836fe00985da1d43e816ec3fb017f457eb,
                1634069612
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                fistPost,
                0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
                0xfd05fa78b1e81552ec31cd868ce290f5bbbe51989ecd8a3289c0e00c8c47536e,
                1634239293
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                fistPost,
                0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
                0x9c0cf4bc6b1481c3a5734ede86a28c651f43d4d86dd9069d77b0cff418d688f0,
                1634284371
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                fistPost,
                0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
                0x24fc6cb46b332a217bc28c18ef6f2d3a30eafdebd3ab511c204ee0f7d67c29a4,
                1634294741
            )
        );

        //second post
            
        _contract.call(
            abi.encodeWithSignature(
                sig,
                secondPost,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0x56198ab76c43959b7ca93267ae9865c44e24168f648508ebd55e93b7f55cfdac,
                1634070111
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                secondPost,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0xfd05fa78b1e81552ec31cd868ce290f5bbbe51989ecd8a3289c0e00c8c47536e,
                1634120467
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                secondPost,
                0x2661442C0E46FED6FaF6683B6Ba033983244c1F1,
                0x1f70a48eff3a14f15bc957815f935dc1572621760ceaf5a9d475a9763de3a5f4,
                1634122708
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                secondPost,
                0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
                0xe62837006bcf30c0ceef571b7f6e1876ac6fe8a42c7b3ae32b5785a00c5effff,
                1634240027
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                secondPost,
                0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
                0xfb33f3721c8872da894562938dd75be30ce0f20807fb38e15c2d2d4a9be2dc34,
                1634284481
            )
        );
        
        _contract.call(
            abi.encodeWithSignature(
                sig,
                secondPost,
                0x64c4240e082879C7B8CC39a1bF0f7801321B18cA,
                0xb55b8414bfa8df1761541efd19014692b04e248fcfa627e23a2fd925ec2e1727,
                1634588401
            )
        );

    }
}
