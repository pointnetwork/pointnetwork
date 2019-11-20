// Dump demo configs to ~/.point

const path = require('path');
const fs = require('fs');
const os = require('os');

const maindir = path.join(os.homedir(), '.point');
if (!fs.existsSync(maindir)) fs.mkdirSync(maindir);

for(let i of [1,2,3]) {
    let folder = path.join(maindir, 'test'+i);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
        console.log('Folder '+folder+' created.');
    } else {
        console.log('Folder '+folder+' already exists.');
    }

    let configSrcFile = './resources/demo/config.test'+i+'.json';
    let configDstFile = folder + '/config.json';

    if (!fs.existsSync(configSrcFile)) throw new Error('Error: file '+configSrcFile+' not found.');

    const dstFileExisted = fs.existsSync(configDstFile);
    if (dstFileExisted) {
        fs.unlinkSync(configDstFile);
    }

    fs.writeFileSync(configDstFile, fs.readFileSync(configSrcFile, 'utf-8'), 'utf-8');

    if (dstFileExisted) {
        console.log('File '+configDstFile+' replaced.')
    } else {
        console.log('File '+configDstFile+' created.');
    }
}

console.log('');
console.log('Demo files dumped!');
console.log('Use e.g. "./point --datadir ~/.point/test1" for the first instance');