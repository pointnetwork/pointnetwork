// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Hello {
  string public value = 'Hello Contract Default Value';

  function setValue(string memory _value) public {
    value = _value;
  }
}