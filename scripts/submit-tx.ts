import { parseEther, getAddress } from 'viem';
import { network } from 'hardhat';
import { Transaction } from '../types.js';

async function main() {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  // Configuration - update these values
  const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
  const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
  const RECIPIENT = process.env.RECIPIENT;
  const AMOUNT = process.env.AMOUNT || '100'; // Default 100 tokens

  if (!WALLET_ADDRESS) {
    throw new Error('Please set WALLET_ADDRESS environment variable');
  }

  if (!TOKEN_ADDRESS) {
    throw new Error('Please set TOKEN_ADDRESS environment variable');
  }

  if (!RECIPIENT) {
    throw new Error('Please set RECIPIENT environment variable');
  }

  console.log('Submitting transaction to MultiSigWallet...');
  console.log('Wallet Address:', WALLET_ADDRESS);
  console.log('Token Address:', TOKEN_ADDRESS);
  console.log('Recipient:', RECIPIENT);
  console.log('Amount:', AMOUNT, 'tokens');
  console.log('Submitting from:', owner.account.address, '\n');

  // Get wallet contract
  const wallet = await viem.getContractAt(
    'MultiSigWallet',
    getAddress(WALLET_ADDRESS)
  );

  // Check if sender is an owner
  const isOwner = await wallet.read.isOwner([owner.account.address]);
  if (!isOwner) {
    throw new Error('You are not an owner of this wallet');
  }

  const amount = parseEther(AMOUNT);

  // Submit transaction
  console.log('Submitting transaction...');
  const txHash = await wallet.write.submitTransaction([
    getAddress(TOKEN_ADDRESS),
    getAddress(RECIPIENT),
    amount,
  ]);
  console.log('Transaction hash:', txHash);

  // Get transaction count
  const txCount = (await wallet.read.getTransactionCount()) as bigint;
  const txIndex = txCount - 1n;

  console.log('\n✅ Transaction submitted successfully!');
  console.log('Transaction Index:', txIndex.toString());

  // Get transaction details
  const tx = (await wallet.read.getTransaction([txIndex])) as Transaction;
  console.log('\nTransaction Details:');
  console.log('  Token:', tx[0]);
  console.log('  To:', tx[1]);
  console.log('  Amount:', tx[2].toString());
  console.log('  Executed:', tx[3]);
  console.log('  Confirmations:', tx[4].toString(), '/ 2');

  console.log('\n📋 Next Steps:');
  console.log(
    `1. Both owners must confirm: WALLET_ADDRESS=${WALLET_ADDRESS} TX_INDEX=${txIndex} npx hardhat run scripts/confirm-tx.ts --network <network>`
  );
  console.log(
    `2. After 2 confirmations, execute: WALLET_ADDRESS=${WALLET_ADDRESS} TX_INDEX=${txIndex} npx hardhat run scripts/execute-tx.ts --network <network>`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
