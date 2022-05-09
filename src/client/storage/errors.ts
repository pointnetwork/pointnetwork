export class InProgressError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ErrorInProgress';
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class FailedDownloadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FailedDownloadError';
    }
}

export class NotDownloadedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotDownloadedError';
    }
}

export class UnknownStatus extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnknownStatus';
    }
}

/**
 * Tells if an error can be ignored.
 */
export function isRecoverableError(error: Error) {
    const recoverableErrors = [NotDownloadedError, NotFoundError, FailedDownloadError];
    return recoverableErrors.some(e => error instanceof e);
}
