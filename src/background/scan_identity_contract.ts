import BackgroundJob from './background_job';
const ethereum = require('../network/providers/ethereum.js');

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
