import ScanIdentityContractJob from './scan_identity_contract';
import BackgroundJob from './background_job';

class BackgroundJobScheduler {
    jobs: any[] = [];
    isRunning: Record<string, boolean> = {};

    constructor() {
        this.jobs.push({cls: ScanIdentityContractJob, interval: 30000});
    }

    async run() {
        for (const {cls, interval} of this.jobs) {
            const job = new cls();

            this.runJob(job); // Notice: no await

            setInterval(() => {
                this.runJob(job); // Notice: no await
            }, interval);
        }
    }

    async runJob(job: BackgroundJob) {
        if (this.isRunning[ typeof job ]) return;

        this.isRunning[ typeof job ] = true;

        await job.run();

        this.isRunning[ typeof job ] = false;
    }
}

export default BackgroundJobScheduler;