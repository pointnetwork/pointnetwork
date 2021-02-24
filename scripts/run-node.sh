trap "kill 0" EXIT
nodeVer=$(node -v)
frontVer=$(echo "${nodeVer}" |cut -c1-3)
if [ $frontVer != 'v10' ]; then
	echo "Need node v10, your version is ${frontVer}"
	exit
fi

ganache-cli -p 7545 -m 'theme narrow finger canal enact photo census miss economy hotel often' &
sleep 2s

cd ../truffle
truffle deploy --network development
cd ../scripts
sleep 3s
cd ..

./point --datadir ~/.point/test1 -v &
./point --datadir ~/.point/test2 -v &
./point --datadir ~/.point/test3 -v &
sleep 3s
./point deploy example/example.z --datadir ~/.point/test2 -v

wait