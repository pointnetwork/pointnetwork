import BackgroundJob from './background_job';
import ethereum from '../network/providers/ethereum';

class ScanIdentityContractJob extends BackgroundJob {
    constructor() {
        super();
    }

    async run() {
        await ethereum.getPaginatedPastEvents(
            'point',
            'Identity',
            '*',
            {fromBlock: 0, toBlock: 'latest'}
        );
    }
}

export default ScanIdentityContractJob;