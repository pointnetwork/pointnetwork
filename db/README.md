## Knex / Postgres

To test out Knex and Postgres using Docker:

1. (Optional) Rebuild the image so that it uses the latest packages: `docker build -t "pointnetwork/pointnetwork_node:v1.0.3" .` (note the tag is the latest tag currently in `.env` file).
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