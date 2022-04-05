pragma solidity 0.5.16;

import "./KittyOwnership.sol";

/**
 * @title The KittyBreeding contract.
 * @author Erno Wever
 */
contract KittyBreeding is KittyOwnership {
    /**
     * @dev Returns a binary between 00000000-11111111
     */
    function _getRandom() internal view returns (uint8) {
        return uint8(now % 255);
    }

    /**
     * @dev calculates the max of 2 numbers
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    /**
     * @dev mix new dna from 2 input dnas
     */
    function _mixDna(uint256 _dna1, uint256 _dna2) internal view returns (uint256) {
      uint256[8] memory _geneArray;
      uint8 _random = _getRandom();
      uint8 index = 7;

      // Bitshift: move to next binary bit
      for (uint256 i = 1; i <= 128; i = i * 2) {
        // Binary mask with random number
        // Then add 2 last digits from the dna to the new dna
        if (_random & i != 0) {
            _geneArray[index] = uint8(_dna1 % 100);
        } else {
            _geneArray[index] = uint8(_dna2 % 100);
        }

        _dna1 = _dna1 / 100;
        _dna2 = _dna2 / 100;
        index = index - 1;
      }

      // Add a random parameter in a random place
      uint8 newGeneIndex = _random % 7;
      _geneArray[newGeneIndex] = _random % 99;

      uint256 newGene;

      for (uint256 i = 0; i < 8; i = i + 1) {
        newGene = newGene.add(_geneArray[i]);

        if (i != 7) {
          newGene = newGene.mul(100);
        }
      }

      return newGene;
    }

    /**
     * @notice Breed a new kitty based on a mom and dad
     * @param _momId the id of the mom
     * @param _dadId the id of the dad
     */
    function breed(uint256 _momId, uint256 _dadId) public returns (uint256) {
      require(_owns(msg.sender, _momId), "Not own kitty");
      require(_owns(msg.sender, _dadId), "Not own kitty");
      require(_momId != _dadId, "Lets not do this");

      Kitty storage mom = _kitties[_momId];
      Kitty storage dad = _kitties[_dadId];
      
      uint256 _newdna = _mixDna(mom.genes, dad.genes);
      uint256 _generation = max(mom.generation, dad.generation).add(1);

      uint256 newKittyId = _createKitty(
        _momId,
        _dadId,
        _generation,
        _newdna,
        msg.sender
      );

      _kittyToChildren[_dadId].push(newKittyId);
      _kittyToChildren[_momId].push(newKittyId);

      return newKittyId;
    }

    /**
     * @notice Get all the children of a kittyId
     * @param _kittyId the id of the mom
     * @return array of ids of the children
     */
    function getChildren(uint _kittyId) view public returns (uint256[] memory) {
      uint256[] memory children = _kittyToChildren[_kittyId];
      return children;
    }
}
