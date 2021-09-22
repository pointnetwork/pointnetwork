# Starts up a psql console in the db container (connects to point_website_owner database by default)
psql_console:
	docker exec -it pointnetwork_database psql -U pointuser point_website_owner

# Run migrations against the database using the 'website_owner' service
db_migrate:
	docker-compose run --entrypoint "/app/point migrate" website_owner