# Run this script from within the project root folder like so:
# ./scripts/clear-node.sh

# Remove node data cache directory
rm -rf ~/.point/test1/data/
rm -rf ~/.point/test2/data/
rm -rf ~/.point/test3/data/

# Remove pid files
rm ~/.point/test1/point.pid
rm ~/.point/test2/point.pid
rm ~/.point/test3/point.pid

# Replace the config
./point demo

# Create the data/db directly
mkdir -p ~/.point/test1/data/db
mkdir -p ~/.point/test2/data/db
mkdir -p ~/.point/test3/data/db

# Create the peer cache db file
touch ~/.point/test1/data/dht_peercache.db
touch ~/.point/test2/data/dht_peercache.db
touch ~/.point/test3/data/dht_peercache.db