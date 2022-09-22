import {DomainRegistry, PointDomainData} from './types';
import {parseCookieString} from '../util';
import {keccak256} from 'ethereumjs-util';

export const isValidPublicKeyString = (key: string): boolean => (
    typeof key === 'string' && /^(0x)?[a-fA-F0-9]{128}$/.test(key)
);

/**
 * Parses a registry obtained from SNS or ENS and returns
 * Point related information associated to said domain.
 */
export function parseDomainRegistry(registry: DomainRegistry): PointDomainData {
    const values = parseCookieString(registry.content ?? '');
    const {pn_key: pointPublicKey = ''} = values || {};
    const pointAddress = isValidPublicKeyString(pointPublicKey)
        ? keccak256(Buffer.from(pointPublicKey, 'hex')).slice(-20).toString('hex')
        : '';

    return {
        pointAddress,
        pointPublicKey,
        identity: values.pn_alias || '',
        isAlias: Boolean(values.pn_alias),
        routesId: values.pn_alias ? '' : values.pn_routes || '',
        rootDirId: values.pn_alias ? '' : values.pn_root || ''
    };
}
