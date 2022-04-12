// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import '@openzeppelin/contracts/utils/Counters.sol';

contract PointEmail {
    using Counters for Counters.Counter;
    Counters.Counter internal _emailIds;

    struct Email {
        uint256 id;
        address from;
        address to;
        bytes32 encryptedMessageId;
        string encryptedSymmetricObj;
        uint256 createdAt;
    }

    // Email mappings
    mapping(bytes32 => Email) public encryptedMessageIdToEmail;
    mapping(address => Email[]) public toEmails;
    mapping(address => Email[]) public fromEmails;

    enum Action {
        Send
    }

    event StateChange(
        address indexed from,
        address indexed to,
        uint256 indexed date,
        Action action
    );

    function send(
        address to,
        bytes32 encryptedMessageId,
        string memory encryptedSymmetricObj
    ) external {
        _emailIds.increment();

        uint256 newEmailId = _emailIds.current();

        Email memory _email = Email(
            newEmailId,
            msg.sender,
            to,
            encryptedMessageId,
            encryptedSymmetricObj,
            block.timestamp
        );

        // add mapping from encrypted message id to the email id;
        encryptedMessageIdToEmail[encryptedMessageId] = _email;

        // add email to mappings
        toEmails[to].push(_email);
        fromEmails[msg.sender].push(_email);

        emit StateChange(msg.sender, to, block.timestamp, Action.Send);
    }

    function getAllEmailsByToAddress(address to) external view returns (Email[] memory) {
        return toEmails[to];
    }

    function getAllEmailsByFromAddress() external view returns (Email[] memory) {
        return fromEmails[msg.sender];
    }

    function getMessageById(bytes32 encryptedMessageId) external view returns (Email memory email) {
        return encryptedMessageIdToEmail[encryptedMessageId];
    }

    function getInboxEmails() external view returns (Email[] memory) {
        return toEmails[msg.sender];
    }
}
