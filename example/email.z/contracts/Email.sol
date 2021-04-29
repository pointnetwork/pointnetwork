// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

// contract Email {
//   struct mail {
//     address from;
//     address to;
//     string encryptedMessageHash;
//     string encryptedSymmetricKey;
//     uint timestamp;
//   }
//   mail[] mails;
//   event SendEmail(address from, address indexed to, string encryptedMessageHash, string encryptedSymmetricKey, uint timestamp);

//   function send(address to, string memory encryptedMessageHash, string memory encryptedSymmetricKey) public returns (bool result)  {
//         mail memory _mail = mail(msg.sender, to, encryptedMessageHash, encryptedSymmetricKey, block.timestamp);
//         mails.push(_mail);
//         emit SendEmail(msg.sender, to, encryptedMessageHash, encryptedSymmetricKey, block.timestamp);
//         return true;
//   }
// }
contract Email  {
   event SendEmail(address indexed to,
                   string message);

   function send(
     address to,
     string memory message
    ) public returns (bool result) {
       emit SendEmail(to, message);

       return true;
   }
}