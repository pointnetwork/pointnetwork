// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
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

  function send(address memory to, string memory encryptedMessageHash, string memory encryptedSymmetricKey) public  {
        mail memory _mail = mail(msg.sender, to, encryptedMessageHash, encryptedSymmetricKey, block.timestamp);
        mails.push(_mail);
        emit SendEmail(msg.sender, to, encryptedMessageHash, encryptedSymmetricKey, timestamp);
        return true;
  }
}
