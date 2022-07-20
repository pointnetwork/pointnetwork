import {ChainId} from './blockchain-provider';
import {getNetworkConfig} from './utils';

describe('getNetworkConfig', () => {
    it('should return correct config settings for existent chainId', () => {
        const cfg = getNetworkConfig(ChainId.PointYnet);
        expect(cfg.type).toBe('eth');
        expect(cfg.currency_code).toBe('yPOINT');
        expect(cfg.address).toBe('ynet.point.space:44444');
    });

    it('should throw for inexistent chainId', () => {
        const chainId = 'badChainId' as ChainId;
        const wantErr = new Error(`No config found for network with chain_id === ${chainId}`);
        expect(() => getNetworkConfig(chainId)).toThrow(wantErr);
    });
});
