// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PointSocialMigrations {
    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    function migrate(address _contract) public {
        require(msg.sender == _owner, "Access Denied");

        string memory sig = "add(uint256,address,bytes32,bytes32,uint256)";

        _contract.call(
            abi.encodeWithSignature(
                sig,
                1,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0x0a06675482e75ca68ff9624b72f49ca547247ddfe108ef35dbe60a42f0b61a10,
                0x7213abf7636dc13dc7f5b1135e13b209b022e04f4f62559e5a6096ea85a1108d,
                1634132287
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                2,
                0x2d5360AAb543E92efc40B438b813f0FD5fa64620,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                0xecd0e108a98e192af1d2c25055f4e3bed784b5c877204e73219a5203251feaab,
                1634221707
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                3,
                0x2d5360AAb543E92efc40B438b813f0FD5fa64620,
                0x921317564aafceb78d5b16dd89949367ba437239a9a19d91dff9d8f4a3107ea7,
                0x3ee31da5a31f7e9d67bdd41517aaabe237624960db61cdc1ab3f6a05f9a98292,
                1634222732
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                4,
                0x574318Fc15C6Db801dC4719D4f746acF79FfC3cf,
                0x6cf5c64617ed2471496447abd8b905c620046c732f00e965f287421dfb94d91b,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                1634230250
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                5,
                0xF003B0d9ABefd8B8Dea98a003802Baa60b69A09e,
                0xfd41d877049c14922ac693b7bda78e7d654f8e3c2349a2bebdcb8d760841035c,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                1634237758
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                6,
                0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
                0x76faf88b7826ce189618d5f47a9f2cbd5e55e3955e1d74d1214c3fb7a4920690,
                0x6c4a6295f7c6d5424f9c54b63ba9489041aa59bdb2ad3eef3f0cb39ae6b7d881,
                1634285355
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                7,
                0x8834C336ea54f164fE7D797B5aa2d0Cc65c3EF3a,
                0x232e2460af818d3b74b09442a231ddafc42ffa8f18be79635b5914d30aa4c891,
                0x4183c05988d8ab913496336fef89c528c69bce2025e50437abe64466fd605222,
                1634288596
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                8,
                0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
                0x52695c9ee40d6ad09b765bd0bd892ca78a7047eca22b208d15d5ae74f60badfa,
                0x587155d7b480d656de2bb91aa9090778a4a750c5bb280d2c02614a06bb4f04ff,
                1634293825
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                9,
                0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
                0x4c323b6cbe739a806c81b824a2ac8fcd80c5ea20f1062b4a41d4ac6e50f3ef04,
                0x587155d7b480d656de2bb91aa9090778a4a750c5bb280d2c02614a06bb4f04ff,
                1634294254
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                10,
                0xEc8bAaaAf82170f06c6E7e937a7e37c1DAffA45c,
                0xb0936212a42ae1bcb48204eaf01975988e9948b0721fe169766629088fd399ca,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                1634362182
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                11,
                0xb17315291626773aeb5F6B4B4d4FAaacf4B5bc6a,
                0xb24b8538401c033fa3d1c57db7e871c69f7bd4fa3c1a7fd622cc6de1e6cb7925,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                1634364174
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                12,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0xc623ff98cfa1504709cfb6be7a6b3e1ef383781accacbba8bc365df9bfa0869f,
                0xccb5e944d8ca7899949d416d200c3ce111ac36a2b6e85414cec6f93f3353e698,
                1634574080
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                13,
                0xCCb4D3509443B7b6Fe1e2c27FB61dC3D635E3088,
                0x6f7eb7a9eed0eb4e8660144071820fe18e4597c647af6fdca5a14063b08e0f6c,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                1635428005
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                14,
                0x6535DfCAe615068e58d3B96F85b72BD738234e02,
                0x2eaa56ca1b61daea9a3a13ac9f37ade2859c292d003f45546a2df3b0ec262a86,
                0x0000000000000000000000000000000000000000000000000000000000000000,
                1635530735
            )
        );

        persistComments(_contract);
    }

    function persistComments(address _contract) internal {
        string memory sig = "addComments(uint256,address,bytes32,uint256)";

        _contract.call(
            abi.encodeWithSignature(
                sig,
                1,
                1,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0xb87a664b88b76657f5e91ca6a50af72c2d27d2949fc85fd07528fdf0298d5953,
                1634132804
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                5,
                2,
                0xB183c65f61BE14C77e31079A685ddeDEfF9937Ad,
                0xd8f4902ce8afaab5381cca38732a6cc4b784dfae7735c0efdcc1ed58ab70fcad,
                1634284869
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                6,
                3,
                0x8690481754AaFF7f6cC51EeA188a1903C5E451b4,
                0x873a1dcee5a00bb350f24e0cdfcbcc1d34144abe8dde37a5ff67ed3a1f5cd534,
                1634294379
            )
        );

    }

}
