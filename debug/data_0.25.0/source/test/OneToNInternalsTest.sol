pragma solidity 0.5.4;

import "services/OneToN.sol";

contract OneToNInternalsTest is OneToN {

    constructor(
        address _deposit_contract,
        uint256 _chain_id,
        address _service_registry_contract
    )
        OneToN(_deposit_contract, _chain_id, _service_registry_contract)
        public
    {
    }

    function getSingleSignaturePublic(
        bytes memory signatures,
        uint256 i
    )
        public
        returns (bytes memory)
    {
        return OneToN.getSingleSignature(signatures, i);
    }
}
