// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

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