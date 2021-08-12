## Knex / Postgres

To test out Knex and Postgres using Docker:

1. (Optional) Rebuild the image so that it uses the latest packages: `docker build -t "pointnetwork/pointnetwork_node:dev" .` (note the tag is the latest tag currently in `.env` file).
1. Run pointnetwork docker services in dev mode: `docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d`
1. Follow the logs of the website_owner container: `docker-compose logs -f website_owner`
1. Connect a terminal to a psql instance: `docker exec -it pointnetwork_database psql -U pointuser pointdb`
1. Connect a terminal to a running node: `docker exec -it pointnetwork_website_owner bash`
1. Now within the running container terminal:
    1. Optionally rollback database migrations if you want to clear the database schema: `npx knex migrate:rollback`
    1. Run the database migrations using `npx knex migrate:latest`
    1. Run a simple example deployment: `./point deploy ./example/hello.z --datadir $DATADIR`
1. Now within the running psql terminal:
    1. Check the schemas are migrated: `\d files`
    1. Check the data has been saved: `select id, size, redundancy, expires, chunk_count, autorenew from files;`
1. Open the Point Network [PgAdmin Dashboard](http://localhost:5050) and use the credentials as defined in the `docker-compose.yml` file.

## Clear all data from Postgres and LevelDB to run a clean test

In order to clear all the data from both Postgres and LevelDB, you need to do the following:

1. Connect a terminal to a running node: `docker exec -it pointnetwork_website_owner bash`
1. Now within the running container terminal:
    1. Remove the `db` directory: `rm -rf /data/data/db`
    1. Recreate the `db` directory: `mkdir -p /data/data/db`
    1. Recreate the `dht_peercache.db`: `echo '{}' > /data/data/dht_peercache.db`
    1. Restart Node JS by simply saving any js file in the project which will automatically restart node.
    1. Confirm there are no `files` stored in LevelDB using: `curl http://localhost:24681/v1/api/storage/files` (if LevelDB is empty it should respond with `{"status":200,"data":[]}`)
    1. Confirm there are no `chunks` stored in LevelDB using: `curl http://localhost:24681/v1/api/storage/chunks` (if LevelDB is empty it should respond with `{"status":200,"data":[]}`)
1. Connect a terminal to a psql instance: `docker exec -it pointnetwork_database psql -U pointuser pointdb`
    1. Delete all data from `files` table: `DELETE FROM chunks;`
    1. Delete all data from `chunks` table: `DELETE FROM files;`
    1. Check that `files` table is now empty: `select count(*) from files;` (if its empty it should respond with a `count` column with value `0`)
    1. Check that `chunks` table is now empty: `select count(*) from chunks;` (if its empty it should respond with a `count` column with value `0`)
1. Now you are ready to test a deployment with an empty database.

## Run tests

1. Start the services like so: `docker-compose -f docker-compose.yaml -f docker-compose.test.yaml up -d`
1. Now you can run the tests using `docker start pointnetwork_tests`
1. Follow the logs of the container to see the test output: `docker logs -f pointnetwork_tests`
1. Alternatively use the Docker desktop tool to start the `pointnetwork_tests` container and view the logs directly there.