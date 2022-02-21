class HttpNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'HttpNotFoundError';
    }
}

module.exports = {HttpNotFoundError};
