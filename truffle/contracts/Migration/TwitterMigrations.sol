// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TwitterMigrations {
    address private _owner;

    constructor() {
        _owner = msg.sender;
    }

    function migrate(address _contract) public {
        require(msg.sender == _owner, "Access Denied");
        string memory sig = "add(address,bytes32,uint256,uint256)";

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0xa40acf739591f4260467e3ba06aa4c1cf076ea2fc3b1fa66cd3fadec0e9788cc,
                1634338171,
                7
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0xde4d931d7554ac23af6609a53c7a0d305a06579ea75cfe7090cca07ee16e7680,
                1634338192,
                3
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0xde4d931d7554ac23af6609a53c7a0d305a06579ea75cfe7090cca07ee16e7680,
                1634338192,
                3
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0x855a467b064b5435abffb8e7fe4d1a8b34bcce6c7c3e8933d80afde3b585e394,
                1634338542,
                3
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0xEc8bAaaAf82170f06c6E7e937a7e37c1DAffA45c,
                0x25b74e7b58d3d68a9839ef2059f22f1d73f95973714d2f17d1de9ee8b49777da,
                1634362042,
                3
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x64c4240e082879C7B8CC39a1bF0f7801321B18cA,
                0x51528e44450bb1344bfd39fbab2ed3f189108477fec522190019744206100a7a,
                1634588974,
                1
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0xB780b13D48DF86f123Ba09b58Fe9747B00E9babd,
                0x2ec9639a3d98f29e1c8631acab7fe82d570df7d54658e1c8ebb625fe1e1f6c68,
                1634643163,
                0
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0xbFbb3E7A5A2d514ad7022bB56E8Ac354A6524BBb,
                0xe925110a3798889f2e065d141b1bedd27a29333fa6a4d8d8dee4befc1cfd5893,
                1635272736,
                1
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x973d0dBE97Acd4E313cd06D25f9321D01305fE87,
                0xd85d41786f82eb089dbfab6ac4beb686441e993ec16764a32a40a04324719eee,
                1635947889,
                0
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x973d0dBE97Acd4E313cd06D25f9321D01305fE87,
                0x389a3901cf0472016702cc74d20233effc72445e53e5ae2219e0c53e56099b91,
                1635956307,
                1
            )
        );

        _contract.call(
            abi.encodeWithSignature(
                sig,
                0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e,
                0x2073d8cf78ebef49aa0692b6709c894534f2a3e09a28a08cae85c9b0caef3d3e,
                1636198274,
                0
            )
        );

    }
}
