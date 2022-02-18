const fs = require('fs');
const path = require('path');
const {HttpNotFoundError} = require('../../core/exceptions.js');
const logger = require('../../core/log.js');
const log = logger.child({module: 'LocalDirectory'});

class LocalDirectory {
    constructor(ctx) {
        this.ctx = ctx;
    }

    setLocalRoot(localRoot) {
        this.localRoot = localRoot;
    }

    async readFileByPath(filePath, encoding = 'utf-8') {
        const fullPath = path.join(this.localRoot, filePath);

        // Poison null bytes https://nodejs.org/en/knowledge/file-system/security/introduction/#poison-null-bytes
        if (filePath.indexOf('\0') !== -1) {
            throw Error('Null bytes are not allowed');
        }

        // Preventing directory traversal https://nodejs.org/en/knowledge/file-system/security/introduction/#preventing-directory-traversal
        // Must be after poison null bytes check
        if (fullPath.indexOf(this.localRoot) !== 0) {
            throw Error('Directory traversal is not allowed');
        }

        log.debug({filePath, fullPath}, 'LocalDirectory.readFileByPath');

        if (!fs.existsSync(fullPath))
            throw new HttpNotFoundError('This route or file is not found');

        return fs.readFileSync(fullPath, encoding);
    }
}

LocalDirectory.__ignoreThisModelForNow = true;

module.exports = LocalDirectory;
