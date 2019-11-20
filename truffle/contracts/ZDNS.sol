contract ZDNS {
    mapping(string => address) zrecords;

    // In the prototype, we don't check who owns the domain
    function putZRecord(string memory domain, address routesFile) public {
        zrecords[domain] = routesFile;
    }

    function getZRecord(string memory domain) public view returns (address routesFile) {
        return zrecords[domain];
    }
}