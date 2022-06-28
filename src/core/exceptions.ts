export class HttpNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HttpNotFoundError';
    }
}
