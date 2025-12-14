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

  console.log('Confirming transaction in MultiSigWallet...');
  console.log('Wallet Address:', WALLET_ADDRESS);
  console.log('Transaction Index:', txIndex.toString());
  console.log('Confirming as:', owner.account.address, '\n');

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

  // Check if already confirmed
  const alreadyConfirmed = await wallet.read.isConfirmed([
    txIndex,
    owner.account.address,
  ]);
  if (alreadyConfirmed) {
    console.log('⚠️  You have already confirmed this transaction');
    return;
  }

  // Get transaction details before confirming
  const txBefore = (await wallet.read.getTransaction([txIndex])) as Transaction;
  console.log('Transaction Details:');
  console.log('  Token:', txBefore[0]);
  console.log('  To:', txBefore[1]);
  console.log('  Amount:', txBefore[2].toString());
  console.log('  Executed:', txBefore[3]);
  console.log('  Confirmations:', txBefore[4].toString(), '/ 2\n');

  if (txBefore[3]) {
    console.log('⚠️  Transaction already executed');
    return;
  }

  // Confirm transaction
  console.log('Confirming transaction...');
  const txHash = await wallet.write.confirmTransaction([txIndex]);
  console.log('Transaction hash:', txHash);

  // Get updated transaction details
  const txAfter = (await wallet.read.getTransaction([txIndex])) as [
    string,
    string,
    bigint,
    boolean,
    bigint
  ];
  console.log('\n✅ Transaction confirmed!');
  console.log('New Confirmations:', txAfter[4].toString(), '/ 2');

  if (txAfter[4] >= 2n) {
    console.log('\n🎉 Transaction has enough confirmations!');
    console.log('You can now execute it:');
    console.log(
      `WALLET_ADDRESS=${WALLET_ADDRESS} TX_INDEX=${txIndex} npx hardhat run scripts/execute-tx.ts --network <network>`
    );
  } else {
    console.log('\n⏳ Waiting for more confirmations...');
    console.log('Another owner needs to confirm this transaction.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
