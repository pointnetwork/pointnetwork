// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

contract Email {
    struct EmailMessage {
        address from;
        address to;
        bytes32 encryptedMessageId;
        string encryptedSymmetricObj;
        uint timestamp;
    }
    EmailMessage[] messages;
    int256 lastMessageIdx = -1;
    event SendEmail(EmailMessage);
    mapping(bytes32 => uint) messageIdToIdx;

    function send(address to, bytes32 encryptedMessageId, string memory encryptedSymmetricObj) public {
        EmailMessage memory _msg = EmailMessage({from: msg.sender, to: to, encryptedMessageId: encryptedMessageId, encryptedSymmetricObj: encryptedSymmetricObj, timestamp: block.timestamp});
        int256 idx = lastMessageIdx + 1;
        messages.push(_msg);
        messageIdToIdx[encryptedMessageId] = uint256(idx);
        lastMessageIdx++;
        emit SendEmail(_msg);
    }

    function getMessageById(bytes32 encryptedMessageId) public view returns (EmailMessage memory _msg) {
        return messages[messageIdToIdx[encryptedMessageId]];
    }
}
