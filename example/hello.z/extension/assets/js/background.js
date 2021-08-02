/*
Log that we received the message.
Then display a notification. The notification contains the URL,
which we read from the message.

NOTE: If your using Mac make sure you ALLOW notifications from Firefox in System Preferences / Notifications
NOTE: If you want to debug the background script then console messages for background scripts are logged via the browser extension inspect tool. Go to Temporary Extentions (about:debugging#/runtime/this-firefox) and click 'Inspect'
*/
function notify(message) {
    console.log("notify function in background script received message", message);
    var title = browser.i18n.getMessage("notificationTitle");
    var content = browser.i18n.getMessage("notificationContent", message.url);
    browser.notifications.create({
      type: "basic",
      iconUrl: browser.extension.getURL("assets/icons/link.png"),
      title: title,
      message: content
    });
}

/*
Assign `notify()` as a listener to messages from the content script.
*/
browser.runtime.onMessage.addListener(notify);
