// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Counters.sol";

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

    struct EmailMetadata {
        bool important;
        bool deleted;
    }

    // Email mappings
    mapping(bytes32 => Email) public encryptedMessageIdToEmail;
    mapping(address => Email[]) public toEmails;
    mapping(address => Email[]) public fromEmails;

    mapping(bytes32 => mapping(address => EmailMetadata)) public emailMetadata;

    enum Action {
        Send
    }

    event StateChange(
        address indexed from,
        address indexed to,
        uint256 indexed date,
        Action action
    );

    event EmailDeleted(address indexed user, bytes32 indexed id, uint256 timestamp);
    event EmailMarkedAsImportant(address indexed user, bytes32 indexed id, uint256 timestamp);

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

    function getAllEmailsByFromAddress(address from) external view returns (Email[] memory) {
        return fromEmails[from];
    }

    function getMessageById(bytes32 encryptedMessageId) external view returns (Email memory email) {
        return encryptedMessageIdToEmail[encryptedMessageId];
    }

    function getImportantEmails() external view returns (Email[] memory) {
        uint256 maxEmailsQty = toEmails[msg.sender].length;
        Email[] memory temporary = new Email[](maxEmailsQty);

        uint256 counter = 0;

        for (uint256 i = 0; i < maxEmailsQty; i++) {
            Email memory email = toEmails[msg.sender][i];
            EmailMetadata memory metadata = emailMetadata[email.encryptedMessageId][msg.sender];
            if (metadata.important && !metadata.deleted) {
                temporary[counter] = email;
                counter++;
            }
        }

        Email[] memory result = new Email[](counter);
        for (uint256 i = 0; i < counter; i++) {
            result[i] = temporary[i];
        }
        return result;
    }

    function getDeletedEmails() external view returns (Email[] memory) {
        uint256 maxEmailsQty = toEmails[msg.sender].length;
        Email[] memory temporary = new Email[](maxEmailsQty);

        uint256 counter = 0;

        for (uint256 i = 0; i < maxEmailsQty; i++) {
            Email memory email = toEmails[msg.sender][i];
            EmailMetadata memory metadata = emailMetadata[email.encryptedMessageId][msg.sender];
            if (metadata.deleted) {
                temporary[counter] = email;
                counter++;
            }
        }

        Email[] memory result = new Email[](counter);
        for (uint256 i = 0; i < counter; i++) {
            result[i] = temporary[i];
        }
        return result;
    }

    modifier onlySenderOrReceiver(bytes32 _encryptedMessageId) {
        require(
            encryptedMessageIdToEmail[_encryptedMessageId].from == msg.sender ||
                encryptedMessageIdToEmail[_encryptedMessageId].to == msg.sender,
            "Permission Denied"
        );
        _;
    }

    function markAsImportant(bytes32 _encryptedMessageId, bool _important)
        external
        onlySenderOrReceiver(_encryptedMessageId)
    {
        emailMetadata[_encryptedMessageId][msg.sender].important = _important;

        emit EmailDeleted(msg.sender, _encryptedMessageId, block.timestamp);
    }

    function deleteMessage(bytes32 _encryptedMessageId, bool _deleted)
        external
        onlySenderOrReceiver(_encryptedMessageId)
    {
        emailMetadata[_encryptedMessageId][msg.sender].deleted = _deleted;
        emit EmailMarkedAsImportant(msg.sender, _encryptedMessageId, block.timestamp);
    }

    function getMetadata(bytes32 _encryptedMessageId) external view returns (EmailMetadata memory) {
        return emailMetadata[_encryptedMessageId][msg.sender];
    }
}
