const path = require('path');
const fs = require('fs');
const _ = require('lodash');

class Deployer {
    constructor(ctx) {
        this.ctx = ctx;
        this.cache_uploaded = {};
    }

    async start() {
        // todo
    }

    // todo: beware of infinite recursion!
    async processTemplate(fileName, deployPath) {
        if (fileName in this.cache_uploaded) return this.cache_uploaded[ fileName ];

        console.log('uploading '+fileName+'...');

        const cache_dir = path.join(this.ctx.datadir, 'deployer_cache');

        let tmpTemplate, template;

        if (fileName.split('.').slice(-1)[0] !== "zhtml") {
            // don't parse
            template = fs.readFileSync(fileName, { encoding: null });

            console.log('skipping template parser for', fileName, 'hash', this.ctx.utils.hashFnHex(template));

            tmpTemplate = path.join(cache_dir, this.ctx.utils.hashFnHex(template));
            fs.writeFileSync(tmpTemplate, template, { encoding: null });

        } else {
            console.log('parsing template', fileName);

            // do parse
            template = fs.readFileSync(fileName, 'utf-8');

            /////

            const reg = /{% extends ['"](.*?)['"] %}/g;
            let result;
            while((result = reg.exec(template)) !== null) { // todo: what if it's already a hash?
                const subTemplate = path.join(deployPath, 'views', result[1]);
                if (!fs.existsSync(subTemplate)) throw new Error('Template '+result[1]+' ('+subTemplate+') not found!'); // todo: +stack etc.

                const hash = await this.processTemplate(subTemplate, deployPath); // todo: parallelize // todo: what if already uploaded? use cache
                template = template.replace(result[1], hash); // todo: replace using outer stuff as well
            }

            ///

            // todo: dont parse html with regex!1 you'll go to hell for that! or worse, Turbo Pascal coding bootcamp!
            const regs = [
                /\<link[^\>]*?href=['"](.*?)['"]/g,
                /\<img[^\>]*?src=['"](.*?)['"]/g,
            ];
            for(let reg of regs) {
                while((result = reg.exec(template)) !== null) { // todo: what if it's already a hash? // todo: what if it's https:// or something? // todo: what if it's /_storage/<hash>?
                    const fl = path.join(deployPath, 'views', result[1]);
                    if (!fs.existsSync(fl)) throw new Error('Mentioned file '+result[1]+' ('+fl+') not found!'); // todo: +stack etc. // todo: make it a warning?

                    let ext = /(?:\.([^.]+))?$/.exec(result[1])[1];

                    const hash = await this.processTemplate(fl, deployPath); // todo: parallelize // todo: what if already uploaded? use cache // todo: don't use processTemplate for css files! just upload them, and that's it
                    template = template.replace(result[1], '/_storage/'+hash+'.'+ext); // todo: replace using outer stuff as well
                }
            }

            tmpTemplate = path.join(cache_dir, this.ctx.utils.hashFnHex(template));
            fs.writeFileSync(tmpTemplate, template, 'utf-8');
        }

        const uploaded = await this.ctx.client.storage.putFile(tmpTemplate); // todo: and more options

        this.cache_uploaded[ fileName ] = uploaded.id;

        return uploaded.id;
    }

    async deploy(deployPath) {
        const cache_dir = path.join(this.ctx.datadir, 'deployer_cache');

        // todo: error handling, as usual
        let deployConfigFilePath = path.join(deployPath, 'point.deploy.json');
        let deployConfigFile = fs.readFileSync(deployConfigFilePath, 'utf-8');
        let deployConfig = JSON.parse(deployConfigFile);

        // assert(deployConfig.version === 1); // todo: msg

        let target = deployConfig.target;

        let routesFilePath = path.join(deployPath, 'routes.json');
        let routesFile = fs.readFileSync(routesFilePath, 'utf-8');
        let routes = JSON.parse(routesFile);

        //let uploadFiles
        //let parseFiles = // todo: should be queue

        for (let k in routes) {
            if (routes.hasOwnProperty(k)) {
                let v = routes[k];

                let templateFileName = path.join(deployPath, 'views', v);

                const hash = await this.processTemplate(templateFileName, deployPath);
                routes[k] = hash;
            }
        }

        console.log('uploading route file...');
        this.ctx.utils.makeSurePathExists(cache_dir);
        const tmpRoutesFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(JSON.stringify(routes)));
        fs.writeFileSync(tmpRoutesFilePath, JSON.stringify(routes));
        let routeFileUploaded = await this.ctx.client.storage.putFile(tmpRoutesFilePath); // todo: and more options

        await this.updateZDNS(target, routeFileUploaded.id);

        await this.updateKeyValue(target, deployConfig.keyvalue);

        console.log('Deploy finished');
    }

    async updateZDNS(host, id) {
        let target = host.replace('.z', '');
        console.log('Updating ZDNS', {target, id});
        await this.ctx.network.web3bridge.putZRecord(target, '0x'+id);
    }

    async updateKeyValue(target, values) {
        for(let key in values) {
            let value = Object.assign({}, values[key]);
            for(let k in value) {
                let v = value[k];
                if (_.startsWith(k, '__')) {
                    console.log('uploading keyvalue from config', key, k);
                    const cache_dir = path.join(this.ctx.datadir, 'deployer_cache');
                    this.ctx.utils.makeSurePathExists(cache_dir);
                    const tmpFilePath = path.join(cache_dir, this.ctx.utils.hashFnHex(v));
                    fs.writeFileSync(tmpFilePath, v);
                    let uploaded = await this.ctx.client.storage.putFile(tmpFilePath); // todo: and more options

                    delete value[k];
                    value[k.replace('__', '')] = uploaded.id;
                }
            }
            console.log(value);
            await this.ctx.network.web3bridge.putKeyValue(target, key, JSON.stringify(value));
        }
    }
}

module.exports = Deployer;