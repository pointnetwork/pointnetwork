const fs = require('fs');
const path = require('path');

class Directory {
    constructor() {
        this.name = '';
        this.files = [];
        this.localPath = null;
        this.size = 0;
        // todo: include 'version' and 'compat' fields
    }

    setCtx(ctx) {
        this.ctx = ctx;
    }

    async readFileByPath(filePath, encoding = 'utf-8') {
        let fragments = filePath.split('/');
        if (fragments[0] === '') fragments.shift();
        let firstFragment = fragments.shift();
        for(let f of this.files) {
            if (f.name === firstFragment) {
                if (f.type === 'file') {
                    return await this.ctx.client.storage.readFile(f.id, encoding);
                } else if (f.type === 'directory') {
                    if (! f.downloaded) {
                        let subdir = new Directory();
                        subdir.unserialize(await this.ctx.client.storage.readFile(f.id, 'utf-8')); // dir spec is always in utf-8
                        f.downloaded = true;
                        f.dirObj = subdir;
                        f.dirObj.setCtx(this.ctx);
                    }
                    // fragments here are without the first item due to shift in the beginning
                    return f.dirObj.readFileByPath(fragments.join('/'), encoding);
                } // todo: else
            }
        }
        throw Error('readFileByPath failed: Path for '+filePath+' not found');
    }

    setLocalPath(localPath) {
        this.localPath = localPath;
    }

    addFilesFromLocalPath() {
        this.addFilesFromPath(this.localPath);
    }

    addFilesFromPath(dirPath) {
        if (!fs.existsSync(dirPath)) throw Error('Directory '+this.ctx.utils.htmlspecialchars(dirPath)+' does not exist');
        if (!fs.statSync(dirPath).isDirectory()) throw Error('dirPath '+this.ctx.utils.htmlspecialchars(dirPath)+' is not a directory');

        fs.readdirSync(dirPath).forEach(fileName => {
            const combinedFullPath = path.join(dirPath, fileName);
            this.addFile(combinedFullPath, fileName);
        });
    }

    addFile(filePath, name) {
        let size;
        if (fs.statSync(filePath).isDirectory()) {
            let subdir = new Directory();
            subdir.setLocalPath(filePath);
            subdir.addFilesFromLocalPath();
            size = subdir.size;
            this.files.push({
                type: 'directory',
                name: name,
                dirObj: subdir,
                localPath: filePath,
                size,
            });
        } else {
            size = fs.statSync(filePath).size;
            this.files.push({
                type: 'file',
                name: name,
                localPath: filePath,
                size
            });
        }
        this.size += size;
    }

    serialize() {
        let result = {
            type: 'directory',
            files: []
        };
        for(let f of this.files) {
            if (f.type === 'file') {
                result.files.push({
                    type: 'file-pointer',
                    name: f.name,
                    size: f.size,
                    id: f.id
                });
            } else if (f.type === 'directory') {
                result.files.push({
                    type: 'directory-pointer',
                    name: f.name,
                    size: f.size,
                    id: f.id
                });
            } else throw Error('invalid file/dir type: '+f.type);
        }

        console.log(result);

        return JSON.stringify(result);
    }

    unserialize(jsonString) {
        let obj = JSON.parse(jsonString);
        if (obj.type !== 'directory') throw Error('directory unserialize fail: type is not a directory')
        this.size = 0;
        for(let f of obj.files) {
            if (f.type === 'file-pointer') {
                this.files.push({
                    type: 'file',
                    name: f.name,
                    size: f.size,
                    id: f.id,
                    downloaded: false,
                });
            } else if (f.type === 'directory-pointer') {
                this.files.push({
                    type: 'directory',
                    name: f.name,
                    size: f.size,
                    id: f.id,
                    downloaded: false,
                });
            } else throw Error('unserialize directory failed: invalid item type: '+f.type); // todo: sanitize
            this.size += f.size;
        }
    }

    serializeToFile(filePath) {
        fs.writeFileSync(filePath, this.serialize(), 'utf-8');
    }


}

module.exports = Directory;