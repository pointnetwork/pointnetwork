import {ABITracker} from './decode';

let abiTracker: ABITracker;
beforeEach(() => (abiTracker = new ABITracker(500)));

const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

describe('Decode Tx Input Data', () => {
    it('should add two entries', () => {
        expect.assertions(3);
        abiTracker.add('social', 'PointSocial');
        abiTracker.add('email', 'PointEmail');
        expect(abiTracker.has('social', 'PointSocial')).toBe(true);
        expect(abiTracker.has('email', 'PointEmail')).toBe(true);
        expect(abiTracker.len()).toEqual(2);
    });

    it('should not add duplicate entries', () => {
        expect.assertions(1);
        abiTracker.add('social', 'PointSocial');
        abiTracker.add('social', 'PointSocial');
        abiTracker.add('social', 'PointSocial');
        expect(abiTracker.len()).toEqual(1);
    });

    it('should return false when entry does not exist', () => {
        expect.assertions(1);
        expect(abiTracker.has('new', 'SomeContract')).toBe(false);
    });

    it('should delete an expired entry', async () => {
        expect.assertions(3);
        abiTracker.add('social', 'PointSocial');
        expect(abiTracker.has('social', 'PointSocial')).toBe(true);
        await sleep(1_000);
        expect(abiTracker.has('social', 'PointSocial')).toBe(false);
        expect(abiTracker.len()).toEqual(0);
    });

    it('should overwrite older entry', async () => {
        expect.assertions(2);
        abiTracker.add('social', 'PointSocial');
        await sleep(300);
        abiTracker.add('social', 'PointSocial');
        await sleep(300);
        expect(abiTracker.has('social', 'PointSocial')).toBe(true);
        expect(abiTracker.len()).toEqual(1);
    });
});
