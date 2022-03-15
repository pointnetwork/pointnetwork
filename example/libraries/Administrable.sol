// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract Administrable is Context {
    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev Emitted when account is Whitelisted.
     */
    event Whitelisted(address indexed account, uint256 date);

    /**
     * @dev Emitted when account is blacklisted.
     */
    event Blacklisted(address indexed account, uint256 date);

    /**
     * @dev Emitted when account is added to admin list.
     */
    event AdminAdded(address indexed account, uint256 date);

    /**
     * @dev Emitted when account is removed to admin list
     */
    event AdminDeleted(address indexed account, uint256 date);

    /**
     * @dev Emitted whenever admin period changes.
     */
    event AdminPeriodChanged(address indexed sender, address indexed account, uint256 newPeriod);

    /**
     * @dev Admin properties.
     */
    struct Admin {
        uint256 period;
        bool exists;
    }

    /**
     * @dev Blacklisted users.
     */
    mapping(address => bool) private blacklist;

    /**
     * @dev Admins mapping.
     */
    mapping(address => Admin) private admins;

    /**
     * @dev Global paused state
     */
    bool public paused;

    /**
     * @dev Initializes the contract in unpaused state.
     */
    constructor() {
        paused = false;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        require(!isPaused(), "Pausable: paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        require(isPaused(), "Pausable: not paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only by admin
     */
    modifier onlyAdmin(address account) {
        require(account != address(0), "Admin can't be address 0");
        require(!blacklist[account], "This account was blacklisted");
        Admin memory data = admins[account];
        require(data.exists, "Admin not created");
        require(data.period > block.timestamp, "Admin period expired");
        _;
    }

    /**
     * @dev Modifier to make only accesible to whitelisted users.
     */
    modifier onlyWhitelisted(address account) {
        require(!blacklist[account], "Account blacklisted");
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function isPaused() internal view returns (bool) {
        return paused;
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     * - Must be an admin.
     */
    function pause() external whenNotPaused() onlyAdmin(_msgSender()) {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     * - Must be an admin.
     */
    function unpause() external whenPaused() onlyAdmin(_msgSender()) {
        _unpause();
    }

   /**
     * @dev Add user to blacklist.
     *
     * Requirements:
     *
     * - Must be an admin.
     */
    function addToBlacklist(address account) external onlyAdmin(_msgSender()) {
        require(!blacklist[account], "Already added to blacklist");
        blacklist[account] = true;
        emit Blacklisted(account, block.timestamp);
    }

   /**
     * @dev Add user to whitelist.
     *
     * Requirements:
     *
     * - Must be an admin.
     */
    function removeFromBlacklist(address account) external onlyAdmin(_msgSender()) {
        require(blacklist[account], "Account not blacklisted");
        delete blacklist[account];
        emit Whitelisted(account, block.timestamp);
    }

    /**
     * @dev Add the admin user that will control contract state
     */
    function _addAdmin(address account,uint256 totalPeriod) internal {
        require(account != address(0), "Admin can't be address 0");
        require(admins[account].exists == false, "Admin already set");
        require(totalPeriod > block.timestamp + 1 days, "Admins should have minimum 1 day allowance");

        Admin memory data = Admin({
            period:totalPeriod,
            exists:true
        });

        admins[account] = data;

        emit AdminAdded(account, block.timestamp);
    }

    /**
     * @dev Remove's admin from mapping
     */
    function _removeAdmin(address account) internal {
        require(account != address(0), "Admin can't be address 0");
        require(admins[account].exists, "Account is not admin.");
        delete admins[account];

        emit AdminDeleted(account, block.timestamp);
    }

    /**
     * @dev Changes admin period.
     */
    function _changeAdminPeriod(address account, uint256 newPeriod) internal {
        require(account != address(0), "Admin can't be address 0");
        require(admins[account].exists, "Account is not admin.");
        Admin storage data = admins[account];
        data.period = newPeriod;
        emit AdminPeriodChanged(_msgSender(), account, newPeriod);
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal whenNotPaused {
        paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal whenPaused {
        paused = false;
        emit Paused(_msgSender());
    }
}
