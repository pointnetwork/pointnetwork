# Private Site Deployment

If you want to deploy your own private Zapp to Point Network this is where to start.

## Quick Guidelines

To deploy your own, private Zapp to Point Network, all you need to do is:

1. Clone your Zapp site code into the Point Network [./mysites](./mysites) folder. Don't have a Zapp site to deploy? Then try **this one** (TODO: put link to a separate `pointsocial.z` repo here).
1. Start your local Point Network node using Docker using `docker-compose up -d`
1. Run the [./scripts/deploy-mysites-docker.sh](./scripts/deploy-mysites-docker.sh).

For more details and finer graind control over this process, please check the [Point Network Wiki](https://pointnetwork.github.io/)