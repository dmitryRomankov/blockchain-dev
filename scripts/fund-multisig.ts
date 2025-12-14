import { parseEther, formatEther, getAddress } from 'viem';
import { network } from 'hardhat';

async function main() {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  // Configuration - update these values
  const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
  const AMOUNT = process.env.AMOUNT || '1000'; // Default 1000 tokens

  if (!WALLET_ADDRESS) {
    throw new Error('Please set WALLET_ADDRESS environment variable');
  }

  if (!TOKEN_ADDRESS) {
    throw new Error('Please set TOKEN_ADDRESS environment variable');
  }

  console.log('Funding MultiSigWallet with tokens...');
  console.log('Wallet Address:', WALLET_ADDRESS);
  console.log('Token Address:', TOKEN_ADDRESS);
  console.log('From:', owner.account.address);
  console.log('Amount:', AMOUNT, 'tokens\n');

  // Get token contract
  const token = await viem.getContractAt('MyToken', getAddress(TOKEN_ADDRESS));

  // Check sender balance
  const senderBalance = (await token.read.balanceOf([
    owner.account.address,
  ])) as bigint;
  console.log('Your token balance:', formatEther(senderBalance));

  const amount = parseEther(AMOUNT);

  if (senderBalance < amount) {
    throw new Error('Insufficient token balance');
  }

  // Transfer tokens to wallet
  console.log('\nTransferring tokens...');
  const txHash = await token.write.transfer([
    getAddress(WALLET_ADDRESS),
    amount,
  ]);
  console.log('Transaction hash:', txHash);

  // Verify transfer
  const walletBalance = (await token.read.balanceOf([
    getAddress(WALLET_ADDRESS),
  ])) as bigint;
  console.log(
    '\n✅ MultiSigWallet now has:',
    formatEther(walletBalance),
    'tokens'
  );

  const tokenName = await token.read.name();
  const tokenSymbol = await token.read.symbol();
  console.log(`Token: ${tokenName} (${tokenSymbol})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
