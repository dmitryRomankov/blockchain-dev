import { getAddress } from 'viem';
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

  console.log('Revoking confirmation from MultiSigWallet...');
  console.log('Wallet Address:', WALLET_ADDRESS);
  console.log('Transaction Index:', txIndex.toString());
  console.log('Revoking as:', owner.account.address, '\n');

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

  // Check if confirmed
  const isConfirmed = await wallet.read.isConfirmed([
    txIndex,
    owner.account.address,
  ]);
  if (!isConfirmed) {
    console.log('⚠️  You have not confirmed this transaction');
    return;
  }

  // Get transaction details before revoking
  const txBefore = (await wallet.read.getTransaction([txIndex])) as Transaction;
  console.log('Transaction Details:');
  console.log('  Token:', txBefore[0]);
  console.log('  To:', txBefore[1]);
  console.log('  Amount:', txBefore[2].toString());
  console.log('  Executed:', txBefore[3]);
  console.log('  Confirmations:', txBefore[4].toString(), '/ 2\n');

  if (txBefore[3]) {
    console.log('⚠️  Transaction already executed, cannot revoke');
    return;
  }

  // Revoke confirmation
  console.log('Revoking confirmation...');
  const txHash = await wallet.write.revokeConfirmation([txIndex]);
  console.log('Transaction hash:', txHash);

  // Get updated transaction details
  const txAfter = (await wallet.read.getTransaction([txIndex])) as Transaction;
  console.log('\n✅ Confirmation revoked!');
  console.log('New Confirmations:', txAfter[4].toString(), '/ 2');
  console.log(
    '\nYou can confirm again later if needed using the confirm-tx script.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
