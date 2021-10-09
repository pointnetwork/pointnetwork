const fs = require('fs');

class LocalDirectory {
    constructor() {
        this.name = '';
        this.files = [];
        this.original_path = null;
        this.size = 0;
    }

    setHost(host) {
        this.host = host;
    }

    async readFileByPath(filePath, encoding = 'utf-8') {
        console.log('ASKING FOR LocalDirectory.readFileByPath ',{filePath});
        let fileLocalPath = `example/${this.host}/public/${filePath}`;

        return await fs.readFileSync(fileLocalPath, encoding);
    }
}

LocalDirectory.__ignoreThisModelForNow = true;

module.exports = LocalDirectory;