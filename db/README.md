## New!

We're using Sequelize ORM

`id` fields are by default of type Sequelize.DataTypes.BIGINT

By default allowNull is false, put allowNull: true specifically if you want a field to be Nullable 

Make migrations from diff of the models: `./point makemigration --datadir ~/.point/test1`

Migrate: `npm run db:migrate`

If you're operating on a json field, such as `storage_link.segments_sent`, methods such as `.push` will not work, the model only understands that there has been changes if you trigger the direct assignment, i.e. `storage_link.segments_sent = new_segments_sent`, which will trigger the sequelize getter; Moreover, `new_segments_sent` cannot just be the same array with pushed items, it should be shallow copied (such as through spread operator `[...original]`) in order for sequelize to understand it's a different object;

Use `model.refresh()` to reload latest changes from the database if some other thread could have written into it

Use transactions with locking for update to avoid race conditions.

-----------

## Postgres

To test out Sequelize and Postgres using Docker:

1. **Optional** - rebuild the docker image image so that it uses the latest packages: `docker build -t "pointnetwork/pointnetwork_node:dev" .`
1. Run pointnetwork docker services in dev mode: `docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d`
1. Follow the logs of the **website_owner** container: `docker-compose logs -f website_owner`
1. Follow the logs of the **storage_provider** container: `docker-compose logs -f storage_provider`
1. Connect one terminal to **website_owner** node: `docker exec -it pointnetwork_website_owner bash`
1. Run the database migrations for the **website_owner** postgres db using `./point migrate`
1. Connect another terminal to **storage_provider** node: `docker exec -it pointnetwork_storage_provider bash`
1. Run the database migrations for the **storage_provider** postgres db using `./point migrate`
1. Now within the running container terminal for **website_owner** node run a simple example deployment: `./scripts/deploy-sites.sh hello.z --contracts`

## Check data in Postgres

1. Start a new psql terminal: `make psql_console`
1. Within the running psql terminal:
    1. Check the schemas are migrated, for example the files table: `\d files`
    1. Check the data has been saved in `point_website_owner` db, for example load some rows from the files table: `select id, size, redundancy, expires, autorenew from files;`
1. Open the Point Network [PgAdmin Dashboard](http://localhost:5050) and use the credentials as defined in the `docker-compose.yml` file.
1. Navigate to the `Point Network Database Server`, select the database, select the table and from the context menu select 'View/Edit Data -> All Rows'.

## Check data in LevelDB

1. Check all the files in the `website_owner` (or other) LevelDB instance:
    1. Stop the `website_owner` node: `docker-compose stop website_owner`. This is because LevelDB only accepts one concurrent connection.
    1. Start the `website_owner` node overriding the **entrypoint**: `docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml run --entrypoint bash website_owner`
    1. Run the LevelDB playground script: `node ./scripts/db/playground.js`
    1. Adjust the script to output the data that you are insterested in.
    1. Exit the container.
    1. Restart and reattach to the `website_owner` service (follow the steps at the start of this document).

## Clear all data from Postgres and LevelDB to run a clean test

In order to clear all the data from both Postgres and LevelDB, you simply need to drop all docker volumes, like so:

```
docker-compose down
docker system prune --volumes -f
```

Now you are ready to test a deployment with an empty LevelDB and Postgres database.

## Run tests

1. Start the services like so: `docker-compose -f docker-compose.yaml -f docker-compose.test.yaml up -d`
1. Now you can run the tests using `docker start pointnetwork_tests`
1. Follow the logs of the container to see the test output: `docker logs -f pointnetwork_tests`
1. Alternatively use the Docker desktop tool to start the `pointnetwork_tests` container and view the logs directly there.