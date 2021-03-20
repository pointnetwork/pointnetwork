pragma solidity 0.5.4;

import "raiden/TokenNetwork.sol";

contract TokenNetworkInternalStorageTest is TokenNetwork {
    constructor (
        address _token_address,
        address _secret_registry,
        uint256 _chain_id,
        uint256 _settlement_timeout_min,
        uint256 _settlement_timeout_max
    )
        public
        TokenNetwork(
            _token_address,
            _secret_registry,
            _chain_id,
            _settlement_timeout_min,
            _settlement_timeout_max,
            msg.sender,
            MAX_SAFE_UINT256,
            MAX_SAFE_UINT256
        )
    {

    }

    function updateBalanceProofDataPublic(
        uint256 channel_identifier,
        address participant,
        uint256 nonce,
        bytes32 balance_hash
    )
        public
    {
        Channel storage channel = channels[channel_identifier];
        return updateBalanceProofData(
            channel,
            participant,
            nonce,
            balance_hash
        );
    }

    function updateUnlockDataPublic(
        uint256 channel_identifier,
        address participant,
        address partner,
        uint256 locked_amount,
        bytes32 locksroot
    )
        public
    {
       return storeUnlockData(
            channel_identifier,
            participant,
            partner,
            locked_amount,
            locksroot
        );
    }

    function getMaxPossibleReceivableAmountPublic(
        address participant1,
        uint256 participant1_transferred_amount,
        uint256 participant1_locked_amount,
        address participant2,
        uint256 participant2_transferred_amount,
        uint256 participant2_locked_amount
    )
        public
        view
        returns (uint256)
    {

        uint256 channel_identifier;

        channel_identifier = getChannelIdentifier(participant1, participant2);
        Channel storage channel = channels[channel_identifier];
        Participant storage participant1_state = channel.participants[participant1];
        Participant storage participant2_state = channel.participants[participant2];
        SettlementData memory participant1_settlement;
        SettlementData memory participant2_settlement;

        participant1_settlement.deposit = participant1_state.deposit;
        participant1_settlement.withdrawn = participant1_state.withdrawn_amount;
        participant1_settlement.transferred = participant1_transferred_amount;
        participant1_settlement.locked = participant1_locked_amount;

        participant2_settlement.deposit = participant2_state.deposit;
        participant2_settlement.withdrawn = participant2_state.withdrawn_amount;
        participant2_settlement.transferred = participant2_transferred_amount;
        participant2_settlement.locked = participant2_locked_amount;
        return getMaxPossibleReceivableAmount(
            participant1_settlement,
            participant2_settlement
        );
    }

    function verifyBalanceHashDataPublic(
        address to_verify,
        address partner,
        uint256 transferred_amount,
        uint256 locked_amount,
        bytes32 locksroot
    )
        public
        view
        returns (bool)
    {
        uint256 channel_identifier;
        channel_identifier = getChannelIdentifier(to_verify, partner);
        Channel storage channel = channels[channel_identifier];
        Participant storage to_verify_state = channel.participants[to_verify];
        return verifyBalanceHashData(
            to_verify_state,
            transferred_amount,
            locked_amount,
            locksroot
        );
    }

    function getChannelAvailableDepositPublic(
        address participant1,
        address participant2
    )
        public
        view
        returns (uint256 total_available_deposit)
    {
        uint256 channel_identifier = getChannelIdentifier(participant1,
        participant2);
        Channel storage channel = channels[channel_identifier];
        Participant storage participant1_state = channel.participants[participant1];
        Participant storage participant2_state = channel.participants[participant2];
        return getChannelAvailableDeposit(
           participant1_state,
           participant2_state
        );
    }
}

contract TokenNetworkSignatureTest is TokenNetwork {
    constructor (
        address _token_address,
        address _secret_registry,
        uint256 _chain_id,
        uint256 _settlement_timeout_min,
        uint256 _settlement_timeout_max
    )
        TokenNetwork(
            _token_address,
            _secret_registry,
            _chain_id,
            _settlement_timeout_min,
            _settlement_timeout_max,
            msg.sender,
            MAX_SAFE_UINT256,
            MAX_SAFE_UINT256
        )
        public
    {

    }

    function recoverAddressFromBalanceProofPublic(
        uint256 channel_identifier,
        bytes32 balance_hash,
        uint256 nonce,
        bytes32 additional_hash,
        bytes memory signature
    )
        public
        view
        returns (address signature_address)
    {
        return recoverAddressFromBalanceProof(
            channel_identifier,
            balance_hash,
            nonce,
            additional_hash,
            signature
        );
    }

    function recoverAddressFromBalanceProofCounterSignaturePublic(
        MessageTypeId message_type_id,
        uint256 channel_identifier,
        bytes32 balance_hash,
        uint256 nonce,
        bytes32 additional_hash,
        bytes memory closing_signature,
        bytes memory non_closing_signature
    )
        public
        view
        returns (address signature_address)
    {
        return recoverAddressFromBalanceProofCounterSignature(
            message_type_id,
            channel_identifier,
            balance_hash,
            nonce,
            additional_hash,
            closing_signature,
            non_closing_signature
        );
    }

    /* function recoverAddressFromCooperativeSettleSignaturePublic(
        uint256 channel_identifier,
        address participant1,
        uint256 participant1_balance,
        address participant2,
        uint256 participant2_balance,
        bytes signature
    )
        view
        public
        returns (address signature_address)
    {
        return recoverAddressFromCooperativeSettleSignature(
            channel_identifier,
            participant1,
            participant1_balance,
            participant2,
            participant2_balance,
            signature
        );
    } */

    function recoverAddressFromWithdrawMessagePublic(
        uint256 channel_identifier,
        address participant,
        uint256 total_withdraw,
        uint256 expiration_block,
        bytes memory signature
    )
        public
        view
        returns (address signature_address)
    {
        return recoverAddressFromWithdrawMessage(
            channel_identifier,
            participant,
            total_withdraw,
            expiration_block,
            signature
        );
    }
}

contract TokenNetworkUtilsTest is TokenNetwork {
    constructor (
        address _token_address,
        address _secret_registry,
        uint256 _chain_id,
        uint256 _settlement_timeout_min,
        uint256 _settlement_timeout_max
    )
        TokenNetwork(
            _token_address,
            _secret_registry,
            _chain_id,
            _settlement_timeout_min,
            _settlement_timeout_max,
            msg.sender,
            MAX_SAFE_UINT256,
            MAX_SAFE_UINT256
        )
        public
    {

    }

    function getHashAndUnlockedAmountPublic(bytes memory locks)
        public
        view
        returns (bytes32, uint256)
    {
        return getHashAndUnlockedAmount(locks);
    }

    function getLockedAmountFromLockPublic(bytes memory locks, uint256 offset)
        public
        view
        returns (uint256)
    {
        return getLockedAmountFromLock(locks, offset);
    }

    function minPublic(uint256 a, uint256 b) view public returns (uint256)
    {
        return min(a,b);
    }

    function maxPublic(uint256 a, uint256 b) view public returns (uint256)
    {
        return max(a,b);
    }

    function failsafe_subtractPublic(uint256 a, uint256 b) view public returns (uint256, uint256)
    {
        return failsafe_subtract(a,b);
    }

    function failsafe_additionPublic(uint256 a, uint256 b) view public returns (uint256)
    {
        return failsafe_addition(a, b);
    }

    function get_max_safe_uint256() pure public returns (uint256) {
        return uint256(0 - 1);
    }
}
