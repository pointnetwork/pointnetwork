"use strict";
exports.__esModule = true;
exports.parseDomainRegistry = void 0;
var util_1 = require("../util");
/**
 * Parses a registry obtained from SNS or ENS and returns
 * Point related information associated to said domain.
 */
function parseDomainRegistry(registry) {
    var _a;
    var values = (0, util_1.parseCookieString)((_a = registry.content) !== null && _a !== void 0 ? _a : '');
    // If the registry has a `pn_alias`, it means we need to redirect
    // all requests to the `.sol` domain to the `.point` alias.
    if (values['pn_alias']) {
        return { identity: values['pn_alias'], isAlias: true };
    }
    // The registry does not have a `pn_alias`, which means we need to fetch
    // the content using the routes ID and root directory ID stored in the
    // domain registry.
    return {
        identity: '',
        isAlias: false,
        routesId: values['pn_routes'] || '',
        rootDirId: values['pn_root'] || ''
    };
}
exports.parseDomainRegistry = parseDomainRegistry;
