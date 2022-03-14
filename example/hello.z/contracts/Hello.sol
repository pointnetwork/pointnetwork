// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

contract Hello {
  string public value = "Hello Contract Default Value";
  bytes32 public storageValue;
  bytes32 public storageImage;
  int public counter = 0;

  event HelloWorld(string message);
  event UpdatedValue(string oldValue, string newValue);
  enum Action {SetValue, SetStorageValue, SetStoreImage, SetValueAndCounter}

  event StateChange(
    address indexed from,
    uint256 indexed date,
    Action indexed action
  );

  // Setter functions for testing contract write send interactions
  function incrementCounter() external {
    counter++;
  }
  function setValue(string memory newValue) external {
    string memory oldValue = value;
    value = newValue;
    emit UpdatedValue(oldValue, newValue);
  }

  // Should save the storage id of a text file on storage layer
  function setStorageValue(bytes32 newStorageValue) external {
    storageValue = newStorageValue;
    emit StateChange(msg.sender, block.timestamp, Action.SetStorageValue);
  }

  function setStorageImage(bytes32 newStorageImage) external {
    storageImage = newStorageImage;
    emit StateChange(msg.sender, block.timestamp, Action.SetStoreImage);
  }

  function setValueAndCounter(string memory newValue, int newCounter) external {
    value = newValue;
    counter = newCounter;
    emit StateChange(msg.sender, block.timestamp, Action.SetValueAndCounter);
  }

  function emitHelloWorldEvent(string memory message) external {
      emit HelloWorld(message);
  }

  // Getter functions for testing contract read only call interactions

  function echo(string memory ping) external pure returns(string memory) {
    return ping;
  }

  function square(int num) external pure returns (int) {
    return num * num;
  }

  function add(int num1, int num2) external pure returns (int) {
    return num1 + num2;
  }
}