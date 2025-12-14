// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MultiSigWallet
 * @dev A multi-signature wallet contract for secure token transfers
 * @notice Requires 2 out of 2 confirmations to execute transactions
 *
 * Key Features:
 * - Two owners with equal authority
 * - Requires both owners to confirm before execution
 * - Supports ERC20 token transfers
 * - Owners can revoke confirmations before execution
 * - Comprehensive event logging for all actions
 * - Follows checks-effects-interactions pattern for security
 */
contract MultiSigWallet is ReentrancyGuard {
    // Events:
    /// @notice Emitted when a new transaction is submitted
    /// @param owner The owner who submitted the transaction
    /// @param txIndex The index of the submitted transaction
    /// @param token The token address to transfer
    /// @param to The recipient address
    /// @param amount The amount of tokens to transfer
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed token,
        address to,
        uint256 amount
    );

    /// @notice Emitted when an owner confirms a transaction
    /// @param owner The owner who confirmed
    /// @param txIndex The index of the confirmed transaction
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);

    /// @notice Emitted when an owner revokes their confirmation
    /// @param owner The owner who revoked confirmation
    /// @param txIndex The index of the transaction
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);

    /// @notice Emitted when a transaction is executed successfully
    /// @param owner The owner who executed the transaction
    /// @param txIndex The index of the executed transaction
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);

    // Errors:
    error NotOwner();
    error TxDoesNotExist();
    error TxAlreadyExecuted();
    error TxAlreadyConfirmed();
    error CannotExecute();
    error TxNotConfirmed();
    error TxFailed();
    error InvalidOwner();
    error OwnersRequired();
    error InvalidRequiredConfirmations();

    // State Variables:
    /// @notice Array of wallet owners
    address[] public owners;

    /// @notice Mapping to check if an address is an owner
    mapping(address => bool) public isOwner;

    /// @notice Number of confirmations required to execute a transaction
    uint256 public immutable numConfirmationsRequired;

    /// @notice Structure to represent a transaction
    /// @param token The ERC20 token contract address
    /// @param to The recipient address
    /// @param amount The amount of tokens to transfer
    /// @param executed Whether the transaction has been executed
    /// @param numConfirmations Number of confirmations received

    // Transaction Structure: Why address two times?
    struct Transaction {
        address token;
        address to;
        uint256 amount;
        bool executed;
        uint256 numConfirmations;
    }

    /// @notice Array of all transactions
    Transaction[] public transactions;

    /// @notice Mapping from tx index => owner => confirmation status
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // Modifiers:
    /// @notice Restricts function access to owners only
    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }

    /// @notice Validates that a transaction exists
    /// @param _txIndex The transaction index to validate
    modifier txExists(uint256 _txIndex) {
        if (_txIndex >= transactions.length) revert TxDoesNotExist();
        _;
    }

    /// @notice Validates that a transaction has not been executed
    /// @param _txIndex The transaction index to validate
    modifier notExecuted(uint256 _txIndex) {
        if (transactions[_txIndex].executed) revert TxAlreadyExecuted();
        _;
    }

    /// @notice Validates that the sender has not confirmed the transaction
    /// @param _txIndex The transaction index to validate
    modifier notConfirmed(uint256 _txIndex) {
        if (isConfirmed[_txIndex][msg.sender]) revert TxAlreadyConfirmed();
        _;
    }

    // Constructor
    /// @notice Initializes the multi-sig wallet with two owners
    /// @param _owners Array of owner addresses (must be exactly 2)
    /// @dev Validates owners and sets required confirmations to 2
    constructor(address[] memory _owners) {
        if (_owners.length != 2) revert OwnersRequired();
        if (_owners[0] == address(0) || _owners[1] == address(0)) {
            revert InvalidOwner();
        }
        if (_owners[0] == _owners[1]) revert InvalidOwner();

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = 2;
    }

    // External Functions
    /// @notice Submits a new transaction for token transfer
    /// @param _token The ERC20 token contract address
    /// @param _to The recipient address
    /// @param _amount The amount of tokens to transfer
    /// @dev Only owners can submit transactions
    /// @dev Automatically confirms the transaction for the submitter
    function submitTransaction(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        uint256 txIndex = transactions.length;

        transactions.push(
            Transaction({
                token: _token,
                to: _to,
                amount: _amount,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _token, _to, _amount);
    }

    /// @notice Confirms a pending transaction
    /// @param _txIndex The index of the transaction to confirm
    /// @dev Only owners can confirm
    /// @dev Owner cannot confirm the same transaction twice
    /// @dev Transaction must exist and not be executed
    function confirmTransaction(
        uint256 _txIndex
    )
        external
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /// @notice Executes a transaction once required confirmations are met
    /// @param _txIndex The index of the transaction to execute
    /// @dev Only owners can execute
    /// @dev Requires exactly 2 confirmations (both owners)
    /// @dev Uses nonReentrant modifier to prevent reentrancy attacks
    /// @dev Follows checks-effects-interactions pattern
    function executeTransaction(
        uint256 _txIndex
    ) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) nonReentrant {
        Transaction storage transaction = transactions[_txIndex];

        // CHECKS: Verify sufficient confirmations
        if (transaction.numConfirmations < numConfirmationsRequired) {
            revert CannotExecute();
        }

        // EFFECTS: Mark as executed before external call
        transaction.executed = true;

        // INTERACTIONS: Execute the token transfer
        bool success = IERC20(transaction.token).transfer(
            transaction.to,
            transaction.amount
        );

        if (!success) revert TxFailed();

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    /// @notice Revokes a confirmation for a pending transaction
    /// @param _txIndex The index of the transaction
    /// @dev Only owners can revoke their own confirmations
    /// @dev Transaction must exist, not be executed, and be confirmed by sender
    function revokeConfirmation(
        uint256 _txIndex
    ) external onlyOwner txExists(_txIndex) notExecuted(_txIndex) {
        if (!isConfirmed[_txIndex][msg.sender]) revert TxNotConfirmed();

        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }
    // View Functions
    /// @notice Returns the list of owners
    /// @return Array of owner addresses
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    /// @notice Returns the total number of transactions
    /// @return The transaction count
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    /// @notice Returns detailed information about a transaction
    /// @param _txIndex The index of the transaction
    /// @return token The token address
    /// @return to The recipient address
    /// @return amount The transfer amount
    /// @return executed Whether the transaction has been executed
    /// @return numConfirmations The number of confirmations received
    function getTransaction(
        uint256 _txIndex
    )
        external
        view
        returns (
            address token,
            address to,
            uint256 amount,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.token,
            transaction.to,
            transaction.amount,
            transaction.executed,
            transaction.numConfirmations
        );
    }
}
