# Deployspace Folder

The deployspace folder should be kept empty. It is used by the [./point-deploy](../scripts/point-deploy) script.

## Getting Started

To Deploy a Zapp from **any** folder location.

1. Copy the [./point-deploy](../scripts/point-deploy) script to your global executable folder. On a Mac this is the folder `/usr/local/bin` (so just run `cp ~/.point/src/pointnetwork/scripts/point-deploy /usr/local/bin`)
2. Make sure that Point Network repo is cloned to your local machine in the directory `~/.point/src`.
3. Start a Point Network node in the specific environment you want to deploy to from the `~/.point/src` directory.
4. Navigate to the folder where you have your Zapp that you want to deploy.
5. While in the Zapp folder, run the `point-deploy` executable.

## What does it do?

The `point-deploy` executable performs the following steps:

1. Copies all the contents from the folder where you executed the command into the `deployspace` folder of your Point Network node on your host machine (so in `~/.point/src/pointnetwork/deployspace`)
2. Executes the `./scripts/deploy-from-deployspace.sh` script from within the running `website_owner` container.
3. The `deploy-from-deployspace.sh` script runs the `point deploy` command for the site now in the `deployspace` which deployes your site to the network.