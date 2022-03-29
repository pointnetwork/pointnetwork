## Hello.point Extention Demo

This is a very basic demo to show the core parts of building a browser extention and how to install, run and debug it in your browser.

### Tutorial

For a full, in-depth overview of building an extension, try this [tutorial from Sitepoint](https://www.sitepoint.com/create-firefox-add-on/).

### Installation

Open your [Firefox Debugging page](about:debugging#/runtime/this-firefox) and locaate the `manifest.json` file for this extention and select it.

### Manifest

The `manifest.json` contains details about the plugin assets, javascript files and image files. It also states the permissons that should be granted to this plugin such as `notifications` or `alarms`. These must be specified in this file in order for the specific browser APIs to be made available.

### Debugging

To debug there are two parts to consider: scripts that run **within the loaded page context** and script that run **in the background**.

* The `content.js` script runs as part of the loaded page context so all `console.log` will appear on the loaded page console window.
* The `background.js` script runs in the background and all `console.log` will appear in the browser extention developer tool which can be opened by clicking the 'Inspect' button in the installed extention via the [Firefox Debugging page](about:debugging#/runtime/this-firefox).

The Firfox developer debugger tools can be further used to add breakpoints, step through code, add variable watchers and more.

### Notificatons

If you are using a Mac and have disabled Firefox notifications in System Preferences, then be sure to allow them for running this demo otherwise the Notifications API will fail silently!

### i18n

This demo makes use of the i18n API. The locales json files are stored under the `_locales/{langID}` folder structure. Currently English locales are stored in [_locales/en](_locales/en).

### Conclusion

This extention can run against any site that is loaded in your browser (not just hello.point) and is for educational purposes only.