// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;

contract PointEmail {
    uint256 public emailIds;

    struct Email {
        uint id;
        address from;
        address to;
        bytes32 encryptedMessageId;
        string encryptedSymmetricObj;
        uint createdAt;
    }

    // Email mappings
    mapping(bytes32 => Email) public encryptedMessageIdToEmail;
    mapping(address => Email[]) public toEmails; // mapping to address to emails

    function send(address to, bytes32 encryptedMessageId, string memory encryptedSymmetricObj) external {
        require(to != address(0), "Can't send email to address 0");
        emailIds++;
        Email memory _email = Email(
            emailIds, 
            msg.sender, 
            to, 
            encryptedMessageId, 
            encryptedSymmetricObj, 
            block.timestamp
        );
        // add mapping from encrypted message id to the email id;
        encryptedMessageIdToEmail[encryptedMessageId] = _email;
        // add email to toEmails mapping
        toEmails[to].push(_email);
    }

    function getAllEmailsByToAddress(address to) external view returns(Email[] memory) {
        require(to != address(0), "Can't get email from address 0");

        return toEmails[to];
    }

    // example "0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function getMessageById(bytes32 encryptedMessageId) external view returns (Email memory email) {
        return encryptedMessageIdToEmail[encryptedMessageId];
    }
}
