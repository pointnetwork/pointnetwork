// From gist: https://gist.github.com/nucklehead/b568dc13d01b18b902c524754a7c9cd4
let path = require('path'), fs=require('fs');

function fromDir(startPath, filter, callback){

    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    let files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
        let filename = path.join(startPath,files[i]);
        let stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            fromDir(filename, filter, callback); //recurse
        }
        else if (filter.test(filename)) {
            callback(filename, files[i])
        }
    }
}

function justPrint(filePath, fileName){
    console.log('-- found: ', fileName.split('.')[0]);
}

let iconNames = []
function addTolist(filePath, fileName) {
    iconNames.push({
        iconName: fileName.split('.')[0],
        filePath,
        used: false
    })
}

function checkIfUnsused(filePath, fileName) {
    let data = fs.readFileSync(filePath)
    iconNames.forEach((icon, index, iconList) => {
        if (data.includes(`["name","${icon.iconName}"]`) || // for Angular 8 / view engine
            data.includes(`"name","${icon.iconName}"`) || // for Angular 9+ / ivy
            data.includes(`name:"${icon.iconName}"`) || 
            data.includes(`icon:"${icon.iconName}"`) || 
            data.includes(`"backButtonIcon","${icon.iconName}"`)) { // for stenciljs
            console.log('--- icon used', icon.iconName)
            iconList[index].used = true;
        }
    })
}

fromDir('public/svg',/\.svg$/, justPrint);
fromDir('public/svg',/\.svg$/, addTolist);
fromDir('public',/\.(js|css|html)$/, checkIfUnsused);

iconNames.forEach((icon) => {
    if(!icon.used){
        console.log('--- will delete unused icon', icon.iconName)
        fs.unlink(icon.filePath, (err) => {
            if (err) {
                console.error(err);
            }
        })
    }
})
