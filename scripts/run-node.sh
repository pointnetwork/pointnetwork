# Run this script from within the project root folder like so:
# ./scripts/run-node.sh

trap "kill 0" EXIT
nodeVer=$(node -v)
frontVer=$(echo "${nodeVer}" |cut -c1-3)
if [ $frontVer != 'v10' ]; then
	echo "Need node v10, your version is ${frontVer}"
	exit
fi

ganache-cli -p 7545 -m 'theme narrow finger canal enact photo census miss economy hotel often' &
sleep 2s

cd hardhat
npx hardhat run scripts/deploy.ts --network development
cd ..
sleep 3s

./point --datadir ~/.point/test1 -v &
sleep 20
./point --datadir ~/.point/test2 -v &
sleep 10
./point --datadir ~/.point/test3 -v &
sleep 10

./point deploy example/blog.point --datadir ~/.point/test2 -v

wait