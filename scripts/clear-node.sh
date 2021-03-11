# Run this script from within the project root folder like so:
# ./scripts/clear-node.sh

# Replace the config
./point demo

# Remove node data cache directory
rm -rf ~/.point/test1/data/
rm -rf ~/.point/test2/data/
rm -rf ~/.point/test3/data/

# Remove pid files
rm ~/.point/test1/point.pid
rm ~/.point/test2/point.pid
rm ~/.point/test3/point.pid

# Create the data/db directlry
mkdir -p ~/.point/test1/data/db
mkdir -p ~/.point/test2/data/db
mkdir -p ~/.point/test3/data/db