const nodeid = 'test2';
const level = require('level');
const os = require("os");
const dbdir = `~/.point/${nodeid}/data/db`.replace("~", os.homedir);
const db = level(dbdir);
const stream = db.createReadStream();
db.open();

stream.on('data', (kv) => {
    console.log(kv);
});