import {DomainRegistry, PointDomainData} from './types';
import {parseCookieString} from '../util';

/**
 * Parses a registry obtained from SNS or ENS and returns
 * Point related information associated to said domain.
 */
export function parseDomainRegistry(registry: DomainRegistry): PointDomainData {
    const values = parseCookieString(registry.content ?? '');
    return {
        pointAddress: values.pn_addr || '',
        identity: values.pn_alias || '',
        isAlias: Boolean(values.pn_alias),
        routesId: values.pn_alias ? '' : values.pn_routes || '',
        rootDirId: values.pn_alias ? '' : values.pn_root || ''
    };
}
