// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

contract Notifications {
    struct NotificationMessage {
        address to;
        string notificationMessage;
    }
	
    event TestNotification(address indexed to, NotificationMessage notificationMessage);
    event TestNotification2(address indexed to, NotificationMessage notificationMessage);
    event TestNotification3(address indexed to, NotificationMessage notificationMessage);

    NotificationMessage[] notifications;

    function notify() public {
	NotificationMessage memory _msg = NotificationMessage({
	    to: msg.sender,
	    notificationMessage: "Hello!"});

	notifications.push(_msg);
	emit TestNotification(msg.sender, _msg);
    }
    
}
