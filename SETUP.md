# Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your Private Key

#### Option A: Using Hardhat Keystore (Recommended - More Secure)

```bash
# Set your private key securely
npx hardhat keystore set PRIVATE_KEY
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat keystore set SEPOLIA_RPC_URL
```

#### Option B: Using Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit .env and add your credentials
# NEVER commit .env to git!
```

### 3. Get Testnet Funds

**Polygon Amoy Testnet:**

- https://faucet.polygon.technology/ (Official Polygon Faucet)
- https://www.alchemy.com/faucets/polygon-amoy

**Alternative Faucets:**

- https://faucets.chain.link/polygon-amoy

### 4. Compile Contracts

```bash
npx hardhat compile
```

### 5. Run Tests

```bash
# Run all tests
npx hardhat test

# Run only Solidity tests
npx hardhat test solidity

# Run only TypeScript/Node.js tests
npx hardhat test nodejs
```

### 6. Deploy to Testnet

**Deploy to Polygon Amoy:**

```bash
npx hardhat ignition deploy --network polygonAmoy ignition/modules/Counter.ts
```

**Deploy to Ethereum Sepolia (optional):**

```bash
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

## 📝 Available Networks

- `hardhatMainnet` - Local simulated L1 chain
- `hardhatOp` - Local simulated Optimism chain
- `sepolia` - Ethereum Sepolia testnet
- `polygonAmoy` - Polygon Amoy testnet (Chain ID: 80002)

## 🔐 Security Notes

- **NEVER** commit your `.env` file or private keys to git
- Use the Hardhat Keystore for better security
- Only use testnet accounts, never mainnet private keys in configuration
- Get your private key from MetaMask: Account Details → Export Private Key

## 📚 Additional Resources

- [Hardhat 3 Documentation](https://hardhat.org/docs/getting-started)
- [Viem Documentation](https://viem.sh/)
- [Polygon Documentation](https://docs.polygon.technology/)
- [Polygon Amoy Testnet Info](https://docs.polygon.technology/tools/network-faucets/)
- [Polygonscan Amoy](https://amoy.polygonscan.com/)
