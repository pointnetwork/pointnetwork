// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

contract Template  {
    using Counters for Counters.Counter;
    Counters.Counter internal _exampleIds;

    struct Example {
        uint id;
        address from;
        bytes32 contents;
        uint createdAt;
    }

    Example[] examples;
    mapping(address => Example[]) examplesByOwner;
    mapping(uint => Example) exampleById;

    // Post data functions
    // example bytes32: "0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function addExample(bytes32 contents) public {
        _exampleIds.increment();
        uint newExampleId = _exampleIds.current();
        Example memory _example = Example(newExampleId, msg.sender, contents, block.timestamp);
        examples.push(_example);
        exampleById[newExampleId] = _example;
        examplesByOwner[msg.sender].push(_example);
    }

    function getAllExamples() public view returns(Example[] memory) {
        Example[] memory _examples = new Example[](examples.length);
        for(uint256 i = 0; i<examples.length; i++) {
            _examples[i] = exampleById[examples[i].id];
        }
        return _examples;
    }

    function getAllExamplesByOwner(address owner) view public returns(Example[] memory) {
        Example[] memory _examples = new Example[](examplesByOwner[owner].length);
        for(uint256 i = 0; i<examplesByOwner[owner].length; i++) {
            _examples[i] = exampleById[examplesByOwner[owner][i].id];
        }
        return _examples;
    }

    function getExampleById(uint id) view public returns(Example memory) {
        return exampleById[id];
    }
}