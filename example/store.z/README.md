## Store.z Example App

This is a React JS app. So you will need to install dependencies for it and run a build watcher if you want to develop it further.

1. CD into the [./example/store.z/](./example/store.z/) directory.
1. Run `npm i` to install the sites dependencies
1. Run `npm run watch` (or `npm run watch:docker` if you are running the Node using Docker) to have *parcel* watch the site and build it on any detected changes
1. Run `./scripts/deploy-sites.sh store.z --contracts` (from the node root folder) to deploy the sites `views` directory that was built using parcel.
1. From the [Point SDK repo README](https://github.com/pointnetwork/pointsdk#using-web-ext), follow the instructions to start an instance of Firefox with the Point SDK extention already installed using `web-ext` command.