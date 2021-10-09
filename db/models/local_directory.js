const fs = require('fs');

class LocalDirectory {
    setLocalRoot(localRoot) {
        this.localRoot = localRoot;
    }

    async readFileByPath(filePath, encoding = 'utf-8') {
        console.log('ASKING FOR LocalDirectory.readFileByPath ',{filePath});
        let fileLocalPath = `${this.localRoot}/public/${filePath}`;

        return await fs.readFileSync(fileLocalPath, encoding);
    }
}

LocalDirectory.__ignoreThisModelForNow = true;

module.exports = LocalDirectory;