class KademliaStorage {
    constructor(ctx) {
        this.ctx = ctx;
    }

    get(...args) {
        console.log(...args);
    }

    put(...args) {
        console.log(...args);
    }

    del(...args) {
        console.log(...args);
    }

    createReadStream(...args) {
        console.log(...args);
    }
}

module.exports = KademliaStorage;
