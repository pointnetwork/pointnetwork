## Run tests

1. Start the test services like so: `docker-compose -f docker-compose.test.yaml up -d`
1. Now you can run the tests using `docker start pointnetwork_tests`
1. Follow the logs of the container to see the test output: `docker logs -f pointnetwork_tests`
1. Alternatively use the Docker desktop tool to start the `pointnetwork_tests` container and view the logs directly there.

## Run tests from within container

1. Start the test database service like so: `docker-compose -f docker-compose.test.yaml up -d database`
1. Now run the service overriding the ENTRYPOINT like so: `docker-compose -f docker-compose.test.yaml run --entrypoint bash tests`
1. In the terminal of the running tests container, run the tests like so: `npx jest --watchAll`
1. Use the Jest watch menu in the terminal to run tests as required