# Starts up a psql console in the db container
psql_console:
	docker exec -it pointnetwork_database psql -U pointuser pointdb

# Run migrations against the database using the 'website_owner' service
db_migrate:
	docker-compose run --entrypoint "npx knex migrate:latest" website_owner