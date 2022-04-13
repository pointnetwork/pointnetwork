// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

// This is an example contract. Please remove and create your own!
contract Template  {
    using Counters for Counters.Counter;
    Counters.Counter internal _exampleIds;

    struct Example {
        uint id;
        address from;
        bytes32 contents;
        uint createdAt;
    }

    enum Action {Example}

    event StateChange(
        address indexed from,
        uint256 indexed date,
        Action indexed action
    );

    Example[] public examples;
    mapping(address => Example[]) public examplesByOwner;
    mapping(uint => Example) public exampleById;

    // Post data functions
    // example bytes32: "0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function addExample(bytes32 contents) external {
        _exampleIds.increment();
        uint newExampleId = _exampleIds.current();
        Example memory _example = Example(newExampleId, msg.sender, contents, block.timestamp);
        examples.push(_example);
        exampleById[newExampleId] = _example;
        examplesByOwner[msg.sender].push(_example);
        emit StateChange(msg.sender, block.timestamp, Action.Example);
    }

    function getAllExamples() external view returns(Example[] memory) {
        Example[] memory _examples = new Example[](examples.length);
        for(uint256 i = 0; i<examples.length; i++) {
            _examples[i] = exampleById[examples[i].id];
        }
        return _examples;
    }

    function getAllExamplesByOwner(address owner) external view returns(Example[] memory) {
        Example[] memory _examples = new Example[](examplesByOwner[owner].length);
        for(uint256 i = 0; i<examplesByOwner[owner].length; i++) {
            _examples[i] = exampleById[examplesByOwner[owner][i].id];
        }
        return _examples;
    }

    function getExampleById(uint id) external view returns(Example memory) {
        return exampleById[id];
    }
}
