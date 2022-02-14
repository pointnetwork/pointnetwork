// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Hello {
  string public value = "Hello Contract Default Value";
  bytes32 public storageValue;
  bytes32 public storageImage;
  int public counter = 0;

  event HelloWorld(string message);
  event UpdatedValue(string oldValue, string newValue);

  // Setter functions for testing contract write send interactions
  function incrementCounter() public {
    counter++;
  }
  function setValue(string memory _newValue) public {
    string memory _oldValue = value;
    value = _newValue;
    emit UpdatedValue(_oldValue, _newValue);
  }

  // Should save the storage id of a text file on storage layer
  function setStorageValue(bytes32 _newStorageValue) public {
    storageValue = _newStorageValue;
  }

  function setStorageImage(bytes32 _newStorageImage) public {
    storageImage = _newStorageImage;
  }

  function setValueAndCounter(string memory _value, int _counter) public {
    value = _value;
    counter = _counter;
  }

  function emitHelloWorldEvent(string memory _message) public {
      emit HelloWorld(_message);
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