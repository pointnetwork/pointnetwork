# Template Example Zapp

Welcome to the Template Example Zapp. This README is a basic guide to getting started with this application.

This is a React JS app. So you will need to install dependencies for it and run a build watcher if you want to develop it further.

## Main Libraries

This template Zapp uses:

* [React JS](https://reactjs.org/) **v 17.x**
* [React Bootstrap](https://react-bootstrap.github.io/) **v 2.x**
* [Bootstrap](https://getbootstrap.com/) **v 5.x**

## Prepare for deployment

Since this a React JS site it rquires to be built before it can be deployed as follows:

1. Run `npm i`
2. Run `npm run build`

Now a `public` folder will be created containing the deployable built site. You can now deploy the site to the network using the `point-deploy` executable. For details on deploying to the network see this [README](../../deployspace/README.md)

## Prepare for development

1. CD into the [./example/template.point](./example/template.point) directory.
1. Run `npm i` to install the sites dependencies
1. Run `npm run watch` (or `npm run watch:docker` if you are running the Node using Docker) to have *parcel* watch the site and build it on any detected changes
1. Run `./scripts/deploy-sites.sh template --contracts` (from the node root folder) to deploy the sites `views` directory that was built using parcel.
1. From the [Point SDK repo README](https://github.com/pointnetwork/pointsdk#using-web-ext), follow the instructions to start an instance of Firefox with the Point SDK extention already installed using `web-ext` command.