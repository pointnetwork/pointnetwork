import {ABITracker} from './decode';

let abiTracker: ABITracker;
beforeEach(() => (abiTracker = new ABITracker(500)));

const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout));

describe('Decode Tx Input Data', () => {
    it('should add two entries', () => {
        abiTracker.add('social', 'PointSocial');
        abiTracker.add('email', 'PointEmail');

        expect.assertions(3);
        expect(abiTracker.has('social', 'PointSocial')).toBe(true);
        expect(abiTracker.has('email', 'PointEmail')).toBe(true);
        expect(abiTracker.len()).toEqual(2);
    });

    it('should not add duplicate entries', () => {
        abiTracker.add('social', 'PointSocial');
        abiTracker.add('social', 'PointSocial');
        abiTracker.add('social', 'PointSocial');

        expect.assertions(1);
        expect(abiTracker.len()).toEqual(1);
    });

    it('should return false when entry does not exist', () => {
        expect.assertions(1);
        expect(abiTracker.has('new', 'SomeContract')).toBe(false);
    });

    it('should delete an expired entry', async () => {
        abiTracker.add('social', 'PointSocial');

        expect.assertions(3);
        expect(abiTracker.has('social', 'PointSocial')).toBe(true);
        await sleep(1_000);
        expect(abiTracker.has('social', 'PointSocial')).toBe(false);
        expect(abiTracker.len()).toEqual(0);
    });

    it('should overwrite older entry', async () => {
        abiTracker.add('social', 'PointSocial');
        await sleep(300);
        abiTracker.add('social', 'PointSocial');
        await sleep(300);

        expect.assertions(2);
        expect(abiTracker.has('social', 'PointSocial')).toBe(true);
        expect(abiTracker.len()).toEqual(1);
    });
});
