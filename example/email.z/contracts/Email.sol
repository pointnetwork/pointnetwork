// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Email {
  struct mail {
    address from;
    address to;
    string encryptedMessageHash;
    string encryptedSymmetricKey;
    uint timestamp;
  }
  mail[] mails;
  event SendEmail(address from, address indexed to, string encryptedMessageHash, string encryptedSymmetricKey, uint timestamp);

  function send(address to, string memory encryptedMessageHash, string memory encryptedSymmetricKey) public {
        mail memory _mail = mail(msg.sender, to, encryptedMessageHash, encryptedSymmetricKey, block.timestamp);
        mails.push(_mail);
        emit SendEmail(msg.sender, to, encryptedMessageHash, encryptedSymmetricKey, block.timestamp);
  }
  function getByMessageHash(string memory encryptedMessageHash) public view returns (address, address, string memory, string memory, uint) {
    for (uint i = 0; i < mails.length; i++) {
      if (keccak256(abi.encodePacked(mails[i].encryptedMessageHash)) == keccak256(abi.encodePacked(encryptedMessageHash))) {
       return (mails[i].from, mails[i].to, mails[i].encryptedMessageHash, mails[i].encryptedSymmetricKey, mails[i].timestamp);
      }
    }
  }
}
