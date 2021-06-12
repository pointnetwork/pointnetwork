// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Hello {
  string public value = 'Hello Contract Default Value';
  int public counter = 0;

  // Setter functions for testing contract write send interactions
  function incrementCounter() public {
    counter++;
  }
  function setValue(string memory _value) public {
    value = _value;
  }

  function setValueAndCounter(string memory _value, int _counter) public {
    value = _value;
    counter = _counter;
  }

  // Getter functions for testing contract read only call interactions

  function echo(string memory _ping) public pure returns(string memory) {
    return _ping;
  }

  function square(int num) public pure returns (int) {
    return num * num;
  }

  function add(int num1, int num2) public pure returns (int) {
    return num1 + num2;
  }
}