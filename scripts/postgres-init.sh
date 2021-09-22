#!/bin/bash
set -e
set -u

function create_database() {
    local DATABASE=$1
    echo "    Creating database \"$DATABASE\""
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $DATABASE;
        GRANT ALL PRIVILEGES ON DATABASE $DATABASE TO $POSTGRES_USER;
EOSQL
}

if [[ $DATABASE == *" "* ]]; then
    echo "Creating databases: $DATABASE"
    for DB in $DATABASE; do
        create_database $DB
    done
    echo "Databases successfully created"
else
    echo "Creating a database: $DATABASE"
    create_database $DATABASE
    echo "Database successfully created"
fi
