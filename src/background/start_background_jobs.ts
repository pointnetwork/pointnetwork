import BackgroundJobScheduler from './scheduler';

export default async () => {
    const scheduler = new BackgroundJobScheduler();
    await scheduler.run();
};
