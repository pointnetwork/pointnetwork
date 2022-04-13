// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

contract PointEmail  {
    using Counters for Counters.Counter;
    Counters.Counter internal _emailIds;

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

    enum Action {Send}

    event StateChange(
        address indexed from,
        address indexed to,
        uint256 indexed date,
        Action  action
    );

    function send(address to, bytes32 encryptedMessageId, string memory encryptedSymmetricObj) external {
        _emailIds.increment();
        uint newEmailId = _emailIds.current();
        Email memory _email = Email(
            newEmailId, msg.sender,
            to,
            encryptedMessageId,
            encryptedSymmetricObj,
            block.timestamp
        );
        // add mapping from encrypted message id to the email id;
        encryptedMessageIdToEmail[encryptedMessageId] = _email;
        // add email to toEmails mapping
        toEmails[to].push(_email);
        emit StateChange(msg.sender, to, block.timestamp, Action.Send);
    }

    function getAllEmailsByToAddress(address to) external view returns(Email[] memory) {
        return toEmails[to];
    }

    // example "0x0000000000000000000000000000000000000000000068692066726f6d20706e"
    function getMessageById(bytes32 encryptedMessageId) external view returns (Email memory email) {
        return encryptedMessageIdToEmail[encryptedMessageId];
    }
}
