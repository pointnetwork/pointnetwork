const path = require('path');
const fs = require('fs');

const create = async ({website}) => {
    website = website.trim();
    if (!website) throw new Error('No {website} parameter given');

    if (!website.endsWith('.point') && !website.endsWith('.sol')) {
        throw new Error('{website} should end with .point, .sol or other web3 domain');
    }

    if (!/^[a-z0-9\.]*?$/ig.test(website)) {
        throw new Error('Invalid {website} name given');
    }

    // * Create directory
    const relative_path = './' + website;
    if (fs.existsSync(relative_path)) throw new Error('Seems like directory ' + relative_path + ' already exists!');
    fs.mkdirSync(relative_path);
    const website_dir = path.resolve(relative_path);
    if (!website_dir) throw new Error('Could not create directory ' + relative_path);

    // * Create point.deploy.json
    fs.writeFileSync(path.join(website_dir, 'point.deploy.json'), JSON.stringify({
        version: 0.1,
        target: website,
        keyvalue: {},
        contracts: [],
        upgradable: false,
        rootDir: 'public'
    }, null, 4));

    // * Create routes.json
    const routes = {'/': 'index.html'};
    fs.writeFileSync(path.join(website_dir, 'routes.json'), JSON.stringify(routes, null, 4));

    // * Copy public directory
    const templatePath = path.resolve(__dirname, '..', '..', '..', 'resources', 'app_templates', 'empty');
    if (!templatePath) throw new Error('Could not locate public template directory to copy from');
    fs.cpSync(templatePath, path.join(website_dir, 'public'), {recursive: true});

    console.info('Website directory "' + website + '" successfully created! Now you can `cd` into it and `point deploy`');
};

module.exports = create;
