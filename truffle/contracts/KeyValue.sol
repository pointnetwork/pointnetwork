contract KeyValue {
    mapping(string => string) data;

    // In the prototype, we don't check who owns the domain
    function put(string memory key, string memory value) public {
        data[key] = value;
    }

    function get(string memory key) public view returns (string memory value) {
        return data[key];
    }
}