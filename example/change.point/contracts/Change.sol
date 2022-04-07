// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

contract Change {

    struct Support {
        address supporter;
        uint256 timestamp;
    }

    struct Petition {
        uint256 id;
        address author;
        string title;
        string content;
        uint256 timestamp;
    }

    mapping(uint256 => Petition) private _petitionsMap;
    uint256[] private _petitionsIndexes;

    mapping(uint256 => Support[]) private _petitionSupport;
    mapping(uint256 => mapping(address => uint)) _petitionSupportIndex;

    constructor() {}

    event PetitionCreated(uint256 indexed id, string title);

    function createPetition(string memory title_, string memory content_) public {
        uint256 _id = _petitionsIndexes.length;
        _petitionsMap[_id] = Petition({
            id:_id,
            author:msg.sender,
            title:title_,
            content:content_,
            timestamp:block.timestamp
        });
        _petitionsIndexes.push(_id);
        emit PetitionCreated(_id, title_);
    }

    function getPetitions() view public returns (uint256[] memory) {
        return _petitionsIndexes;
    }

    function getPetition(uint256 id_) view public returns (Petition memory) {
        return _petitionsMap[id_];
    }

    function supportPetition(uint256 id_) public {
        require(_petitionsMap[id_].author != address(0), "ERROR_INVALID_PETITION");
        require(_petitionSupportIndex[id_][msg.sender] == 0, "ERROR_PETITION_ALREADY_SUPPORTED");
        Support[] storage supporters = _petitionSupport[id_];
        supporters.push(Support(msg.sender, block.timestamp));
        _petitionSupportIndex[id_][msg.sender] = supporters.length - 1;
    }

    function getSupportersForPetition(uint256 id_) public view returns (Support[] memory) {
        require(_petitionsMap[id_].author != address(0), "ERROR_INVALID_PETITION");
        return _petitionSupport[id_];
    }

}