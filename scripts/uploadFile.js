const fs = require('fs');
const {uploadFile} = require('../dist/client/storage');

const uploadPath = process.argv[2];
if (!uploadPath) {
    console.log('File path expected as a first argument');
    process.exit(1);
}

const main = async () => {
    const file = await fs.promises.readFile(uploadPath);
    return uploadFile(file);
};

main()
    .then((id) => {
        console.log('done', id);
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
