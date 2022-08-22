abstract class BackgroundJob {
    abstract run(): Promise<void>;
}

export default BackgroundJob;
