// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

contract Email  {
   event SendEmail(string messageHash, address indexed from, address indexed to, string encryptedAESKey);

   function sendEmail(
     address to,
     string memory messageHash,
     string memory encryptedAESKey
    ) public returns (bool result) {
       emit SendEmail(messageHash, msg.sender, to,encryptedAESKey);

       return true;
   }
}