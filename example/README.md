## Notes on Example sites

### Store.z

This is a React JS app. So you will need to install dependencies for it and run a build watcher if you want to develop it further.

1. CD into the [./example/store.z/src/](./example/store.z/src/) directory.
1. Run `npm i` to install the sites dependencies
1. Run `npm run watch` to have *parcel* watch the site and build it on any detected changes
1. Run `./point deploy example/store.z --datadir ~/.point/test2` (from the node root folder) to deploy the sites `views` directory that was built using parcel.