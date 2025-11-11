# Polygon Amoy Deployment Guide

## 🟣 Polygon Amoy Testnet Configuration

Your project is now configured for **Polygon Amoy** testnet (Chain ID: 80002).

## 🚀 Quick Start

### 1. Add Polygon Amoy to MetaMask

**Network Details:**

- **Network Name:** Polygon Amoy Testnet
- **RPC URL:** https://rpc-amoy.polygon.technology
- **Chain ID:** 80002
- **Currency Symbol:** MATIC
- **Block Explorer:** https://amoy.polygonscan.com/

### 2. Get Your Private Key from MetaMask

1. Open MetaMask
2. Click on your account
3. Go to **Account Details**
4. Click **Export Private Key**
5. Enter your password
6. Copy the private key

### 3. Set Your Private Key Securely

```bash
# Recommended: Use Hardhat Keystore
npx hardhat keystore set PRIVATE_KEY
```

Or create a `.env` file:

```bash
cp .env.example .env
# Edit .env and paste your private key
```

### 4. Get Test MATIC

Visit any of these faucets:

- 🔗 https://faucet.polygon.technology/
- 🔗 https://www.alchemy.com/faucets/polygon-amoy
- 🔗 https://faucets.chain.link/polygon-amoy

You'll need test MATIC to deploy contracts and pay for gas fees.

### 5. Compile Your Contract

```bash
npx hardhat compile
```

### 6. Run Tests Locally

```bash
# Test on local network first
npx hardhat test
```

### 7. Deploy to Polygon Amoy

```bash
npx hardhat ignition deploy --network polygonAmoy ignition/modules/Counter.ts
```

### 8. Verify Your Contract (Optional)

After deployment, you can verify your contract on Polygonscan:

```bash
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS>
```

You'll need a Polygonscan API key (get it from https://polygonscan.com/apis).

## 📊 Useful Commands

```bash
# Check your account balance
npx hardhat run scripts/check-balance.ts --network polygonAmoy

# Interact with deployed contract
npx hardhat console --network polygonAmoy

# View deployment on explorer
# After deployment, visit: https://amoy.polygonscan.com/address/<YOUR_CONTRACT_ADDRESS>
```

## 🔍 Verify Deployment

After deploying, you'll see output like:

```
✅ Counter deployed to: 0x1234...5678
```

Check it on Polygonscan Amoy:
https://amoy.polygonscan.com/address/0x1234...5678

## ⚠️ Important Notes

- **Amoy** is the testnet for Polygon (replaced Mumbai)
- Test MATIC has no real value
- Always test on testnet before mainnet deployment
- Keep your private key secure and NEVER commit it to git
- Gas fees on Polygon are very low (usually < $0.01)

## 🆘 Troubleshooting

**Issue:** "insufficient funds for gas"

- **Solution:** Get more test MATIC from faucets

**Issue:** "nonce too high" or "replacement transaction underpriced"

- **Solution:** Reset your MetaMask account (Settings → Advanced → Clear activity tab data)

**Issue:** "network does not support ENS"

- **Solution:** This is expected on Amoy, doesn't affect deployment

## 📚 Resources

- [Polygon Documentation](https://docs.polygon.technology/)
- [Polygon Amoy Testnet](https://docs.polygon.technology/tools/network-faucets/)
- [Polygonscan Amoy Explorer](https://amoy.polygonscan.com/)
- [Polygon Faucet](https://faucet.polygon.technology/)
