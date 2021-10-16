# Point Social Example Zapp

Welcome to the Point Social Example Zapp. This README is a basic guide to getting started with this application.

This is a React JS app. So you will need to install dependencies for it and run a build watcher if you want to develop it further.

## Prepare for end user deployment

Since this a React JS site it rquires to be built before it can be deployed as follows:

1. Run `npm i`
2. Run `npm run build`

Now a `public` folder will be created containing the deployable built site. You can now deploy the site to the network using the `point-deploy` executable. For details on deploying to the network see this [README](../../deployspace/README.md)

## Prepare for developer deployment

1. If you don't have the latest `dev` build docker image for Point Network then you need to build it first using `docker build -t "pointnetwork/pointnetwork_node:dev" .`
1. In a new terminal instance, cd to the Point Social folder and install the dependencies and build the site, like so:

        cd example/pointsocial.z
        npm i
        npm run build

1. Update `.env.e2e` with your local account Private Key and Initial Balance in the `ACCOUNT_PK_AND_BALANCE` env key.
1. Update `.env.e2e` with your the Zapp domain that you are developing in the `DEV_ZAPP_HOST` env key (i.e. set this to 'pointsocial.z').
1. In `StorageProviderRegistry.sol` update the `connection` of the defualt provider in the constructor function to: http://storage_provider:9685/#c01011611e3501c6b3f6dc4b6d3fe644d21ab301 (**TODO**: need to avoid having to do this)
1. Stop the nodes using docker: `docker-compose --env-file .env.e2e -f docker-compose.e2e.yaml -f docker-compose.dev.yaml down -v`
1. Start the node using docker: `docker-compose --env-file .env.e2e -f docker-compose.e2e.yaml -f docker-compose.dev.yaml up -d`
1. Open up a terminal to view the `website_owner` logs: ` docker-compose --env-file .env.e2e -f docker-compose.e2e.yaml -f docker-compose.dev.yaml logs -f website_owner`
1. Connect to the running `website_owner` container `docker exec -it pointnetwork_website_owner bash`
1. Deploy Point Social Zapp from within the container (check the logs of the container first to make sure the node has started before running this!): `./scripts/deploy-sites.sh pointsocial.z --contracts`
1. Once the site is deployed you **must start the watch command** from the `example/pointsocial.z` folder like so: `npm run watch`.
1. Start a Point Browser by following the instructions in the [Point SDK repo README](https://github.com/pointnetwork/pointsdk#using-web-ext), to start an instance of Firefox with the Point SDK extention already installed using `web-ext` command.
1. Now, finally, you are able to make your development changes to the Point Social React JS app. Just change any text to check this is working.
1. Check the `watch` command picked up the change and rebuilt the site.
1. Now reload the app in the browser and you should see the changes there. (NOTE: if you get a 500 error when refreshing then make sure you are at the site root i.e. https://pointsocial.z). The page reload only currently works from the site root.

## Adding a new static image file during development

1. Add the image to the `src/assets` folder
1. Add code to import and render the image in the application.
1. Once the watcher has built the site, refresh the page.
1. You will see the new image in the page.s