import { getAddress, formatEther } from 'viem';
import { network } from 'hardhat';
import { Transaction } from '../types.js';

async function main() {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  // Configuration
  const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
  const TX_INDEX = process.env.TX_INDEX;

  if (!WALLET_ADDRESS) {
    throw new Error('Please set WALLET_ADDRESS environment variable');
  }

  if (TX_INDEX === undefined) {
    throw new Error('Please set TX_INDEX environment variable');
  }

  const txIndex = BigInt(TX_INDEX);

  console.log('Executing transaction from MultiSigWallet...');
  console.log('Wallet Address:', WALLET_ADDRESS);
  console.log('Transaction Index:', txIndex.toString());
  console.log('Executing as:', owner.account.address, '\n');

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

  // Get transaction details
  const tx = (await wallet.read.getTransaction([txIndex])) as Transaction;
  console.log('Transaction Details:');
  console.log('  Token:', tx[0]);
  console.log('  To:', tx[1]);
  console.log('  Amount:', formatEther(tx[2]));
  console.log('  Executed:', tx[3]);
  console.log('  Confirmations:', tx[4].toString(), '/ 2\n');

  if (tx[3]) {
    console.log('⚠️  Transaction already executed');
    return;
  }

  if (tx[4] < 2n) {
    console.log('❌ Not enough confirmations');
    console.log('Current confirmations:', tx[4].toString());
    console.log('Required confirmations: 2');
    console.log('\nMore owners need to confirm before execution.');
    return;
  }

  // Get token contract for balance checking
  const token = await viem.getContractAt('MyToken', getAddress(tx[0]));
  const walletBalance = (await token.read.balanceOf([
    getAddress(WALLET_ADDRESS),
  ])) as bigint;

  console.log('Wallet Token Balance:', formatEther(walletBalance));

  if (walletBalance < tx[2]) {
    console.log('❌ Insufficient token balance in wallet');
    return;
  }

  // Get recipient balance before
  const recipientBalanceBefore = (await token.read.balanceOf([
    getAddress(tx[1]),
  ])) as bigint;
  console.log('Recipient Balance Before:', formatEther(recipientBalanceBefore));

  // Execute transaction
  console.log('\nExecuting transaction...');
  const txHash = await wallet.write.executeTransaction([txIndex]);
  console.log('Transaction hash:', txHash);

  // Verify execution
  const txAfter = await wallet.read.getTransaction([txIndex]);
  const recipientBalanceAfter = (await token.read.balanceOf([
    getAddress(tx[1]),
  ])) as bigint;

  console.log('\n✅ Transaction executed successfully!');
  console.log('Recipient Balance After:', formatEther(recipientBalanceAfter));
  console.log(
    'Amount Transferred:',
    formatEther(recipientBalanceAfter - recipientBalanceBefore)
  );
  console.log('Transaction Status: Executed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
