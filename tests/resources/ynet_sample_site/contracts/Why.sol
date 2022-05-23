// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract Why {
    string [] public values;

    constructor() {}

    function storeValue(string memory value) external {
        values.push(value);
    }

    function getValues() external view returns (string[] memory) {
        return values;
    }

    function getValue(uint256 valueId) external view returns (string memory) {
        return values[valueId];
    }
}
