# Multi-Signature Wallet Documentation

## Overview

The MultiSigWallet is a secure smart contract implementation that requires multiple signatures (2 out of 2) to execute token transfers. This ensures that no single owner can unilaterally move funds, providing enhanced security for digital assets.

## Table of Contents

1. [Architecture & Design](#architecture--design)
2. [Contract Features](#contract-features)
3. [Security Analysis](#security-analysis)
4. [Usage Instructions](#usage-instructions)
5. [Testing](#testing)
6. [Deployment Guide](#deployment-guide)

---

## Architecture & Design

### Data Structures

#### 1. Transaction Structure

```solidity
struct Transaction {
    address token;           // ERC20 token contract address
    address to;              // Recipient address
    uint256 amount;          // Amount of tokens to transfer
    bool executed;           // Execution status
    uint256 numConfirmations; // Number of confirmations received
}
```

#### 2. State Variables

- `address[] public owners` - Array storing the two wallet owners
- `mapping(address => bool) public isOwner` - Quick lookup for owner verification
- `uint256 public immutable numConfirmationsRequired` - Required confirmations (set to 2)
- `Transaction[] public transactions` - Array of all submitted transactions
- `mapping(uint256 => mapping(address => bool)) public isConfirmed` - Tracks which owners confirmed which transactions

### Design Decisions

#### Why 2-of-2 Multisig?

- **Maximum Security**: Both owners must agree before any funds move
- **Accountability**: Every transaction requires full consensus
- **Simple Governance**: No complex voting mechanisms needed

#### Storage Layout

- Uses array-based storage for transactions for efficient indexing
- Mappings for O(1) lookup of ownership and confirmation status
- Immutable confirmation requirement for gas optimization

#### Event-Driven Architecture

All state changes emit events for:

- Off-chain monitoring and indexing
- Transaction history tracking
- UI updates and notifications
- Audit trail creation

---

## Contract Features

### 1. Submit Transaction

**Function**: `submitTransaction(address _token, address _to, uint256 _amount)`

**Purpose**: Propose a new token transfer

**Access**: Only owners

**Process**:

1. Creates new Transaction struct
2. Adds to transactions array
3. Emits `SubmitTransaction` event
4. Returns transaction index

**Use Case**: When an owner wants to initiate a token transfer

### 2. Confirm Transaction

**Function**: `confirmTransaction(uint256 _txIndex)`

**Purpose**: Owner approves a pending transaction

**Access**: Only owners who haven't already confirmed

**Validations**:

- Transaction exists
- Not already executed
- Owner hasn't confirmed yet

**Process**:

1. Increments confirmation count
2. Records confirmation in mapping
3. Emits `ConfirmTransaction` event

### 3. Execute Transaction

**Function**: `executeTransaction(uint256 _txIndex)`

**Purpose**: Execute a fully-confirmed transaction

**Access**: Only owners

**Requirements**:

- Exactly 2 confirmations (both owners)
- Transaction not yet executed
- Sufficient token balance in wallet

**Security**:

- Uses `nonReentrant` modifier
- Follows checks-effects-interactions pattern
- Marks executed before external call

**Process**:

1. **CHECKS**: Verify confirmations >= 2
2. **EFFECTS**: Set `executed = true`
3. **INTERACTIONS**: Call token.transfer()
4. Verify success and emit event

### 4. Revoke Confirmation

**Function**: `revokeConfirmation(uint256 _txIndex)`

**Purpose**: Owner withdraws their approval before execution

**Access**: Only owners who have confirmed

**Process**:

1. Decrements confirmation count
2. Updates confirmation mapping
3. Emits `RevokeConfirmation` event

**Use Case**: When an owner changes their mind or spots an error

---

## Security Analysis

### Security Features Implemented

#### 1. Access Control

- **Modifiers**: `onlyOwner` restricts all critical functions
- **Constructor Validation**:
  - Exactly 2 owners required
  - No zero addresses allowed
  - No duplicate owners
- **Immutable Owners**: Owner set cannot be changed post-deployment

#### 2. Reentrancy Protection

- Uses OpenZeppelin's `ReentrancyGuard`
- Applied to `executeTransaction` function
- Prevents recursive calls during token transfers

#### 3. Checks-Effects-Interactions Pattern

```solidity
// CHECKS
if (transaction.numConfirmations < numConfirmationsRequired) {
    revert CannotExecute();
}

// EFFECTS
transaction.executed = true;

// INTERACTIONS
IERC20(transaction.token).transfer(...)
```

This pattern prevents reentrancy attacks by updating state before external calls.

#### 4. State Validation

- **Transaction Existence**: `txExists` modifier
- **Execution Status**: `notExecuted` modifier prevents double-execution
- **Confirmation Status**: `notConfirmed` prevents double-voting
- **Custom Errors**: Gas-efficient error handling

#### 5. Event Logging

Comprehensive events for:

- Audit trails
- Monitoring suspicious activity
- Debugging and verification
- Integration with block explorers

### Potential Risks & Mitigations

| Risk                             | Mitigation                                          |
| -------------------------------- | --------------------------------------------------- |
| **Malicious Token Contract**     | Only interact with verified ERC20 contracts         |
| **Owner Key Compromise**         | 2-of-2 requirement prevents single point of failure |
| **Griefing (Spam Transactions)** | Only owners can submit; monitor off-chain           |
| **Gas Limit Issues**             | Simple transfer logic keeps gas costs low           |
| **Integer Overflow**             | Solidity 0.8.x has built-in overflow protection     |

### Best Practices Applied

1. ✅ **Use Latest Solidity**: Version 0.8.28
2. ✅ **OpenZeppelin Libraries**: Battle-tested, audited code
3. ✅ **Custom Errors**: More gas-efficient than require strings
4. ✅ **Explicit Visibility**: All functions have explicit access specifiers
5. ✅ **NatSpec Comments**: Comprehensive documentation
6. ✅ **Immutable Variables**: Gas optimization for constants
7. ✅ **Fail-Safe Defaults**: Transactions start as not executed
8. ✅ **External Calls Last**: Minimizes reentrancy risk

---

## Usage Instructions

### Prerequisites

- Node.js 22.10.0+
- Hardhat development environment
- Two Ethereum/Polygon accounts (owners)
- ERC20 tokens to transfer

**Note**: For testing purposes, you can use the included `TestToken` contract, which is a simple ERC20 token without upgrade functionality. For production, use standard ERC20 tokens like USDC, USDT, or other established tokens.

### Step-by-Step Workflow

#### 1. Deploy the Wallet

```bash
npx hardhat run scripts/deploy-multisig.ts --network localhost
```

Save the deployed wallet address.

#### 2. Fund the Wallet with Tokens

```bash
WALLET_ADDRESS=0x... TOKEN_ADDRESS=0x... AMOUNT=1000 \
npx hardhat run scripts/fund-multisig.ts --network localhost
```

#### 3. Submit a Transaction (Owner 1 or 2)

```bash
WALLET_ADDRESS=0x... TOKEN_ADDRESS=0x... RECIPIENT=0x... AMOUNT=100 \
npx hardhat run scripts/submit-tx.ts --network localhost
```

Note the transaction index returned (e.g., 0).

#### 4. Confirm Transaction (Owner 1)

```bash
WALLET_ADDRESS=0x... TX_INDEX=0 \
npx hardhat run scripts/confirm-tx.ts --network localhost
```

#### 5. Confirm Transaction (Owner 2)

```bash
# Switch to second owner account or use --network flag with different signer
WALLET_ADDRESS=0x... TX_INDEX=0 \
npx hardhat run scripts/confirm-tx.ts --network localhost
```

#### 6. Execute Transaction (Either Owner)

```bash
WALLET_ADDRESS=0x... TX_INDEX=0 \
npx hardhat run scripts/execute-tx.ts --network localhost
```

#### Optional: Revoke Confirmation

If an owner needs to withdraw approval before execution:

```bash
WALLET_ADDRESS=0x... TX_INDEX=0 \
npx hardhat run scripts/revoke-confirmation.ts --network localhost
```

### Integration Example

```typescript
import { network } from 'hardhat';
import { parseEther } from 'viem';

// Connect to network and get viem instance
const networkContext = await network.connect();
const viem = networkContext.viem;

// Get wallet clients (owners)
const [owner1, owner2] = await viem.getWalletClients();

// Get contract instance
const wallet = await viem.getContractAt('MultiSigWallet', walletAddress);

// Submit transaction
await wallet.write.submitTransaction(
  [tokenAddress, recipientAddress, parseEther('100')],
  { account: owner1.account }
);

// Confirm (as owner1)
await wallet.write.confirmTransaction([0n], { account: owner1.account });

// Confirm (as owner2)
await wallet.write.confirmTransaction([0n], { account: owner2.account });

// Execute (as either owner)
await wallet.write.executeTransaction([0n], { account: owner1.account });
```

---

## Testing

### Test Coverage

The test suite (`test/MultiSigWallet.ts`) covers:

#### Deployment and Initialization (3 tests)

- ✅ Should initialize with correct owners and threshold
- ✅ Should reject invalid owner configurations (zero address, single owner)
- ✅ Should reject duplicate owners

#### Transaction Submission (2 tests)

- ✅ Should allow owner to submit transaction
- ✅ Should reject submission by non-owner

#### Confirmation and Revocation (3 tests)

- ✅ Should allow owners to confirm transaction
- ✅ Should allow owner to revoke confirmation
- ✅ Should reject confirmation by non-owner

#### Transaction Execution (2 tests)

- ✅ Should execute transaction after reaching threshold
- ✅ Should reject execution without sufficient confirmations

#### Edge Cases (3 tests)

- ✅ Should prevent duplicate confirmations
- ✅ Should prevent unauthorized access
- ✅ Should handle invalid transactions (non-existent tx, revoke non-confirmed)

**Total: 13 comprehensive tests**

### Test Token

The test suite uses `TestToken`, a simple non-upgradeable ERC20 token contract specifically designed for testing:

```solidity
contract TestToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("TestToken", "TEST") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
```

This allows each test to deploy fresh token contracts without initialization conflicts.

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/MultiSigWallet.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

### Expected Output

```
MultiSigWallet
  Deployment and Initialization
    ✓ should initialize with correct owners and threshold
    ✓ should reject invalid owner configurations
    ✓ should reject duplicate owners
  Transaction Submission
    ✓ should allow owner to submit transaction
    ✓ should reject submission by non-owner
  Confirmation and Revocation
    ✓ should allow owners to confirm transaction
    ✓ should allow owner to revoke confirmation
    ✓ should reject confirmation by non-owner
  Transaction Execution
    ✓ should execute transaction after reaching threshold
    ✓ should reject execution without sufficient confirmations
  Edge Cases
    ✓ should prevent duplicate confirmations
    ✓ should prevent unauthorized access
    ✓ should handle invalid transactions

✨ 13 passing (1182ms)
```

---

## Deployment Guide

### Local Development

#### Start Local Node

```bash
# Terminal 1
npx hardhat node
```

#### Deploy Contracts

```bash
# Terminal 2
npx hardhat run scripts/deploy-multisig.ts --network localhost
```

### Testnet Deployment (Polygon Amoy)

#### Prerequisites

1. Update `hardhat.config.ts` with your network configuration
2. Set environment variables:

```bash
npx hardhat vars set PRIVATE_KEY
npx hardhat vars set PRIVATE_KEY_OWNER2  # For second owner
```

#### Deploy

```bash
npx hardhat run scripts/deploy-multisig.ts --network polygonAmoy
```

#### Verify Contract

```bash
npx hardhat verify --network polygonAmoy <WALLET_ADDRESS> \
  '["<OWNER1_ADDRESS>","<OWNER2_ADDRESS>"]'
```

### Mainnet Deployment

⚠️ **CRITICAL CHECKLIST**:

- [ ] All tests passing
- [ ] Code audited by professional firm
- [ ] Owners have secure key management (hardware wallets)
- [ ] Emergency procedures documented
- [ ] Sufficient gas funds in deployer account
- [ ] Verify contract source code after deployment
- [ ] Test with small amounts first
- [ ] Document wallet address securely

```bash
npx hardhat run scripts/deploy-multisig.ts --network mainnet
```

---

## Contract Addresses

### Testnet

- **Network**: Polygon Amoy
