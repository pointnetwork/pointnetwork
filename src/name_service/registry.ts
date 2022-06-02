import {DomainRegistry, PointDomainData} from './types';
import {parseCookieString} from '../util';

/**
 * Parses a registry obtained from SNS or ENS and returns
 * Point related information associated to said domain.
 */
export function parseDomainRegistry(registry: DomainRegistry): PointDomainData {
    const values = parseCookieString(registry.content.decoded ?? '');

    // If the registry has a `pn_alias`, it means we need to redirect
    // all requests to the `.sol` domain to the `.point` alias.
    if (values['pn_alias']) {
        return {identity: values['pn_alias'], isAlias: true};
    }

    // The registry does not have a `pn_alias`, which means we need to fetch
    // the content using the routes ID and root directory ID stored in the
    // domain registry.
    return {
        identity: values['pn_id'] || '',
        isAlias: false,
        routesId: values['pn_routes'] || '',
        rootDirId: values['pn_root'] || ''
    };
}
