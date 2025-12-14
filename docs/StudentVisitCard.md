# Student Visit Card - Soulbound NFT

## Overview

The StudentVisitCard is a soulbound ERC-721 NFT contract that creates non-transferable student identity cards on the blockchain. Each student receives exactly one unique token that permanently represents their academic identity.

## Key Features

### 🔒 Soulbound Token

- **Non-Transferable**: Once minted, tokens cannot be transferred, sold, or given away
- **Non-Approvable**: No approvals or operator permissions allowed
- **Permanently Bound**: Token stays with the student's wallet forever

### 🎓 Student Identity

- **Unique Per Student**: One token per wallet address maximum
- **Rich Metadata**: Includes student name, ID, course, and year
- **IPFS Integration**: Metadata and images stored on IPFS

### 👨‍💼 Access Control

- **Owner-Only Minting**: Only contract owner/admin can mint tokens
- **Secure Deployment**: Built on OpenZeppelin's audited contracts

## Contract Architecture

### Data Structures

```solidity
struct StudentData {
    string studentName;  // Full name of the student
    string studentID;    // Unique student identification
    string course;       // Course/Major
    uint16 year;         // Academic year
    bool exists;         // Flag to check if data exists
}
```

### Core Functions

#### For Owner/Admin

**`mintVisitCard(address student, string name, string id, string course, uint16 year)`**

- Mints a soulbound visit card to a student's wallet
- Validates all student data
- Ensures student doesn't already have a card
- Emits `VisitCardMinted` event

**`setBaseURI(string baseURI)`**

- Updates the base URI for metadata
- Allows flexibility in metadata hosting

#### For Everyone (Read-Only)

**`getStudentData(uint256 tokenId)`**

- Returns complete student information for a token

**`getTokenByStudent(address student)`**

- Returns the token ID owned by a student

**`hasVisitCard(address student)`**

- Checks if a student has already minted a card

**`tokenURI(uint256 tokenId)`**

- Returns the metadata URI for a token

**`totalMinted()`**

- Returns the total number of cards minted

### Soulbound Implementation

The contract overrides key ERC-721 functions to enforce soulbound behavior:

```solidity
// Prevents all transfers except minting
function _update(address to, uint256 tokenId, address auth)
    internal override returns (address)

// Disables approvals
function approve(address, uint256) public override

// Disables operator approvals
function setApprovalForAll(address, bool) public override
```

## Deployment

### Prerequisites

```bash
npm install
```

### Environment Setup

Create a `.env` file or use Hardhat vars:

```bash
# Optional: Custom base URI
BASE_URI=ipfs://QmYourCIDHere/
```

### Deploy Locally

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat run scripts/deploy-student-card.ts --network localhost
```

### Deploy to Testnet (Polygon Amoy)

```bash
# Set private key
npx hardhat vars set PRIVATE_KEY

# Deploy
npx hardhat run scripts/deploy-student-card.ts --network polygonAmoy
```

## Usage Guide

### 1. Prepare Metadata

Create JSON metadata files for each student following the ERC-721 standard:

```json
{
  "name": "Student Visit Card #1",
  "description": "Soulbound Student Visit Card - Non-transferable identity token",
  "image": "ipfs://QmImageHash/student-1.png",
  "attributes": [
    { "trait_type": "Student Name", "value": "Alice Johnson" },
    { "trait_type": "Student ID", "value": "STU2025001" },
    { "trait_type": "Course", "value": "Computer Science" },
    { "trait_type": "Year", "value": "2025" },
    { "trait_type": "Type", "value": "Soulbound Token" },
    { "trait_type": "Transferable", "value": "No" }
  ]
}
```

### 2. Upload to IPFS

Upload your metadata folder to IPFS using:

- [Pinata](https://pinata.cloud/)
- [NFT.Storage](https://nft.storage/)
- [Web3.Storage](https://web3.storage/)

Example: If your IPFS CID is `QmAbc123`, your base URI should be `ipfs://QmAbc123/`

### 3. Mint Visit Cards

```bash
CARD_ADDRESS=0xYourContractAddress \
STUDENT_ADDRESS=0xStudentWalletAddress \
STUDENT_NAME="Alice Johnson" \
STUDENT_ID="STU2025001" \
COURSE="Computer Science" \
YEAR=2025 \
npx hardhat run scripts/mint-student-card.ts --network localhost
```

### 4. Query Card Information

By token ID:

```bash
CARD_ADDRESS=0xYourContractAddress \
TOKEN_ID=1 \
npx hardhat run scripts/query-student-card.ts --network localhost
```

By student address:

```bash
CARD_ADDRESS=0xYourContractAddress \
STUDENT_ADDRESS=0xStudentWalletAddress \
npx hardhat run scripts/query-student-card.ts --network localhost
```

## Testing

The test suite covers all functionality:

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/StudentVisitCard.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage

- ✅ **Deployment** (3 tests)

  - Correct name and symbol
  - Base URI configuration
  - Owner assignment

- ✅ **Minting** (6 tests)

  - Owner can mint
  - Token ID incrementation
  - Non-owner prevention
  - Duplicate prevention
  - Invalid data validation

- ✅ **Soulbound Enforcement** (6 tests)

  - Transfer prevention
  - Safe transfer prevention
  - Approval prevention
  - Operator approval prevention
  - Approval getters return correct values

- ✅ **Query Functions** (5 tests)

  - Student data retrieval
  - Token by student lookup
  - Visit card existence check
  - Error handling for non-existent data

- ✅ **Base URI Management** (2 tests)
  - Owner can update
  - Non-owner prevention

**Total: 22 comprehensive tests**

## Security Features

### ✅ Implemented

1. **OpenZeppelin Contracts**: Uses audited, battle-tested implementations
2. **Access Control**: `Ownable` pattern for admin functions
3. **Custom Errors**: Gas-efficient error handling
4. **Input Validation**: All student data validated before minting
5. **Soulbound Logic**: Multiple layers preventing transfers and approvals
6. **Reentrancy Safe**: No external calls in critical functions
7. **Integer Overflow**: Solidity 0.8.x built-in protection

### ⚠️ Considerations

1. **No Token Burning**: Once minted, tokens cannot be burned or removed
2. **Immutable Data**: Student data cannot be updated after minting
3. **Owner Trust**: Contract owner has full minting control
4. **Lost Keys**: If student loses wallet access, token is permanently inaccessible

## Gas Optimization

- Uses custom errors instead of require strings
- Immutable variables where applicable
- Efficient storage layout
- Minimal external calls

## Integration Examples

### JavaScript/TypeScript (Viem)

```typescript
import { createPublicClient, createWalletClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';

// Read contract
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

const hasCard = await publicClient.readContract({
  address: '0xContractAddress',
  abi: StudentVisitCardABI,
  functionName: 'hasVisitCard',
  args: ['0xStudentAddress'],
});

// Write contract (owner only)
const walletClient = createWalletClient({
  chain: polygonAmoy,
  transport: http(),
});

const hash = await walletClient.writeContract({
  address: '0xContractAddress',
  abi: StudentVisitCardABI,
  functionName: 'mintVisitCard',
  args: ['0xStudent', 'Name', 'ID', 'Course', 2025],
});
```

### Web3.js

```javascript
const web3 = new Web3(provider);
const contract = new web3.eth.Contract(StudentVisitCardABI, contractAddress);

// Check if student has card
const hasCard = await contract.methods.hasVisitCard(studentAddress).call();

// Mint card (owner only)
await contract.methods
  .mintVisitCard(
    studentAddress,
    'Alice Johnson',
    'STU2025001',
    'Computer Science',
    2025
  )
  .send({ from: ownerAddress });
```

## Metadata Best Practices

### Image Guidelines

1. **Resolution**: 1000x1000px minimum
2. **Format**: PNG or SVG for best quality
3. **Design**: Include student photo, university branding, and key info
4. **Accessibility**: High contrast, readable text

### JSON Structure

Always include:

- `name`: Unique identifier
- `description`: Clear explanation of soulbound nature
- `image`: IPFS URI to image
- `attributes`: Array of student metadata
- `external_url` (optional): Link to student profile

## Roadmap & Future Enhancements

### Potential Features

- [ ] Metadata update mechanism (with proper validation)
- [ ] Graduation status flag
- [ ] Achievement badges/endorsements
- [ ] Student verification system
- [ ] Batch minting for efficiency
- [ ] Emergency revocation mechanism (with governance)
- [ ] Integration with student information systems

## Troubleshooting

### Common Issues

**"AlreadyHasVisitCard" Error**

- Student already has a token minted
- Check with `hasVisitCard(address)` before minting

**"InvalidStudentData" Error**

- One or more fields are empty or invalid
- Year must be greater than 0

**"OwnableUnauthorizedAccount" Error**

- Only contract owner can mint tokens
- Verify you're using the correct owner account

**"TransferNotAllowed" Error**

- Expected behavior - tokens are soulbound
- Cannot transfer, sell, or give away

## License

MIT License - see LICENSE file for details

## Resources

- [OpenZeppelin ERC-721](https://docs.openzeppelin.com/contracts/4.x/erc721)
- [EIP-721 Standard](https://eips.ethereum.org/EIPS/eip-721)
- [Soulbound Tokens Paper](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Hardhat Documentation](https://hardhat.org/docs)

## Support

For issues or questions:

1. Check the documentation above
2. Review test files for usage examples
3. Open an issue on GitHub
4. Contact the development team

---

**⚠️ Important Security Notice**

This is a soulbound token implementation. Once minted, tokens CANNOT be transferred, sold, or removed from a wallet. Ensure students understand this before minting. Test thoroughly on testnet before mainnet deployment.
