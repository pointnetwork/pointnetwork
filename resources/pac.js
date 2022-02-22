// From: https://www.ctrl.blog/entry/block-localhost-port-scans.html

// SPDX-License-Identifier: CC0-1.0

/**
 Drag this file into Firefox. Write down the contents of the address field. (file://…)
 Type about:config into the address field and press Enter.
 Search for network.proxy..
 Locate and apply the following changes to the configuration:
 Set network.proxy.allow_hijacking_localhost to true.
 Set network.proxy.autoconfig_url to the address you noted in step 2.
 Set network.proxy.type to 2.
 —and you’re done! Any new connections will be filtered through the PAC file. You don’t need to restart Firefox.
 */

const PN_PROXY_SETTING = 'PROXY 127.0.0.1:8666';

const allowed_ports = [
    // uncomment and list any exceptions:
    // 80, 3000, ...
];

// CIDR 0/8 and 127/8
const local_cidrs = /^(?:127(?:\.(?:\d+)){1,3}|0+(?:\.0+){0,3})$/;

// other notations for 0/8 and 127/8
const localhosts = ['localhost', '::', '::1', '0x00.0', '0177.1', '0x7f.1'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FindProxyForURL(url, host) {
    // check if localhost
    if (localhosts.includes(host) || host.match(local_cidrs)) {
        // make exceptions for allowed ports
        let port = url.match(/^\w+:\/\/[^/]+?:(\d+)\//);
        if (port) {
            port = parseInt(port[1]);

            if (allowed_ports.includes(port)) {
                return PN_PROXY_SETTING;
            }
        }

        // reject by proxying to local discard
        return 'PROXY 127.0.0.1:9';
    }

    // all other requests are allowed
    return PN_PROXY_SETTING;
}
