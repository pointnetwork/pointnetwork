export class HttpNotFoundError extends Error {
    private httpStatusCode: number;
    constructor(message: string) {
        super(message);
        this.name = 'HttpNotFoundError';
        this.httpStatusCode = 404;
    }
}
export class HttpForbiddenError extends Error {
    private httpStatusCode: number;
    constructor(message: string) {
        super(message);
        this.name = 'HttpForbiddenError';
        this.httpStatusCode = 403;
    }
}
