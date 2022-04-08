# Point Social Example Zapp

Welcome to the Point Social Example Zapp. This README is a basic guide to getting started with this application.

This is a React JS app. So you will need to install dependencies for it and run a build watcher if you want to develop it further.

## Prepare for end user deployment

Since this a React JS site it rquires to be built before it can be deployed as follows:

1. Run `npm i`
2. Run `npm run build`

Now a `public` folder will be created containing the deployable built site. You can now deploy the site to the network using the `point-deploy` executable. For details on deploying to the network see this [README](../../scripts/README.md)

## Prepare for developer deployment

1. If you don't have the latest `dev` build docker image for Point Network then you need to build it first using `docker build -t "pointnetwork/pointnetwork_node:dev" .`
1. In a new terminal instance, cd to the Point Social folder and install the dependencies and build the site, like so:

        cd example/social.point
        npm i
        npm run watch

1. Now, **stop** the `watch` command that is running from the previous step (use `CTRL+C` to stop the `watch` process).
1. Delete the generated `index.js` and `index.js.map` files from the `example/social.point/public` folder and create empty placeholder files here instead.

        rm public/index.js
        rm public/index.js.map
        touch public/index.js
        touch public/index.js.map

1. Comment out [lines 151](https://github.com/pointnetwork/pointnetwork/blob/master/db/models/file.js#L151) & 152 in `db/models/file.js` class. (NOTE: **do not** commit this change to your branch! Always revert this change before making the commit.).
1. (OPTIONAL) Stop the nodes using docker: `docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml down -v`
1. Start the node using docker: `docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d`
1. Connect to the running `website_owner` container `docker exec -it pointnetwork_website_owner bash`
1. Deploy Point Social Zapp from within the container (check the logs of the container first to make sure the node has started before running this!): `./scripts/deploy-sites.sh social.point --contracts`
1. Once the site is deployed you **must restart the watch command** again from the `example/social.point` folder like so: `npm run watch`.
1. Start a Point Browser by following the instructions in the [Point SDK repo README](https://github.com/pointnetwork/pointsdk#using-web-ext), to start an instance of Firefox with the Point SDK extention already installed using `web-ext` command.
1. Now, finally, you are able to make your development changes to the Point Social React JS app. Just change any text to check this is working.
1. Check the `watch` command picked up the change and rebuilt the site.
1. Now reload the app in the browser and you should see the changes there. (NOTE: if you get a 500 error when refreshing then make sure you are at the site root i.e. https://social.point). The page reload only currently works from the site root.

## Adding a new static image file during development

1. Add the image to the `src/assets` folder
1. Add code to import and render the image in the application.
1. Once the watcher has built the site, refresh the page.
1. You will see the image placeholder, however, **the image will be missing!**. This is because any new static asset files (such as images) must be deployed to Point Network.
1. Now, **stop** the `watch` command that is running from the previous step (use `CTRL+C` to stop the `watch` process).
1. Delete the generated `index.js` and `index.js.map` files from the `example/social.point/public` folder and create empty placeholder files here instead.

        rm public/index.js
        rm public/index.js.map
        touch public/index.js
        touch public/index.js.map

1. Connect (or switch your terminal) to the running `website_owner` container `docker exec -it pointnetwork_website_owner bash`. NOTE: you may already have a terminal session running that is connected to the container so just use that.
1. Deploy Point Social Zapp from within the container (note we do **not** deploy contracts): `./scripts/deploy-sites.sh social.point`
1. Once the site is deployed you **must restart the watch command** again from the `example/social.point` folder like so: `npm run watch`.
1. Now reload the app in the browser and you should see the new image load successfully.