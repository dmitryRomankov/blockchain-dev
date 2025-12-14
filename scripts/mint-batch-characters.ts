import { network } from 'hardhat';

/**
 * Batch mint multiple game character NFTs
 *
 * Usage:
 *   # Mint multiple characters in one transaction
 *   COLLECTION_ADDRESS=0x... RECIPIENT=0x... TOKEN_IDS="0,1,2" AMOUNTS="2,3,1" npx hardhat run scripts/mint-batch-characters.ts --network localhost
 *
 * Environment variables:
 *   COLLECTION_ADDRESS - Address of deployed GameCharacterCollection contract
 *   RECIPIENT - Address to receive the NFTs
 *   TOKEN_IDS - Comma-separated token IDs (e.g., "0,1,2")
 *   AMOUNTS - Comma-separated amounts (e.g., "2,3,1")
 */

async function main() {
  const networkContext = await network.connect();
  const viem = networkContext.viem;
  const publicClient = await viem.getPublicClient();
  const [owner] = await viem.getWalletClients();

  // Get parameters from environment
  const collectionAddress = process.env.COLLECTION_ADDRESS as `0x${string}`;
  const recipient = process.env.RECIPIENT as `0x${string}`;
  const tokenIdsStr = process.env.TOKEN_IDS;
  const amountsStr = process.env.AMOUNTS;

  // Validate inputs
  if (!collectionAddress) {
    throw new Error('COLLECTION_ADDRESS environment variable is required');
  }
  if (!recipient) {
    throw new Error('RECIPIENT environment variable is required');
  }
  if (!tokenIdsStr) {
    throw new Error(
      'TOKEN_IDS environment variable is required (e.g., "0,1,2")'
    );
  }
  if (!amountsStr) {
    throw new Error('AMOUNTS environment variable is required (e.g., "2,3,1")');
  }

  // Parse token IDs and amounts
  const tokenIds = tokenIdsStr.split(',').map((id) => BigInt(id.trim()));
  const amounts = amountsStr.split(',').map((amt) => BigInt(amt.trim()));

  if (tokenIds.length !== amounts.length) {
    throw new Error('TOKEN_IDS and AMOUNTS must have the same length');
  }

  if (tokenIds.length === 0) {
    throw new Error('At least one token ID is required');
  }

  // Validate token IDs
  for (const tokenId of tokenIds) {
    if (tokenId > 9n) {
      throw new Error(`Invalid token ID: ${tokenId}. Must be between 0 and 9`);
    }
  }

  console.log('Batch Minting Game Character NFTs...');
  console.log('Collection:', collectionAddress);
  console.log('Recipient:', recipient);
  console.log('Token IDs:', tokenIds.map((id) => id.toString()).join(', '));
  console.log('Amounts:', amounts.map((amt) => amt.toString()).join(', '));
  console.log('Owner:', owner.account.address);

  // Get contract instance
  const collection = await viem.getContractAt(
    'GameCharacterCollection',
    collectionAddress
  );

  // Verify all characters are initialized and get details
  console.log('\nCharacter Details:');
  for (let i = 0; i < tokenIds.length; i++) {
    const tokenId = tokenIds[i];
    const isInitialized = await collection.read.isCharacterInitialized([
      tokenId,
    ]);
    if (!isInitialized) {
      throw new Error(`Character with token ID ${tokenId} is not initialized`);
    }

    const [name, color, speed, strength, rarity] =
      (await collection.read.getCharacterAttributes([tokenId])) as [
        string,
        string,
        number,
        number,
        string
      ];

    console.log(`  ${i + 1}. ${name} (ID: ${tokenId}) - ${rarity}`);
    console.log(`     Color: ${color}, Speed: ${speed}, Strength: ${strength}`);
    console.log(`     Minting: ${amounts[i]} NFT(s)`);
  }

  // Check current balances
  console.log('\nCurrent Balances:');
  for (let i = 0; i < tokenIds.length; i++) {
    const balance = (await collection.read.balanceOf([
      recipient,
      tokenIds[i],
    ])) as bigint;
    console.log(`  Token ${tokenIds[i]}: ${balance.toString()}`);
  }

  // Batch mint
  console.log('\nBatch minting...');
  const txHash = await collection.write.mintBatch(
    [recipient, tokenIds, amounts, '0x'],
    { account: owner.account }
  );

  console.log('Transaction hash:', txHash);

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  console.log(
    'Transaction confirmed in block:',
    receipt.blockNumber.toString()
  );

  // Check new balances
  console.log('\n✅ Batch minting successful!');
  console.log('\nNew Balances:');
  const results = [];
  for (let i = 0; i < tokenIds.length; i++) {
    const tokenId = tokenIds[i];
    const balance = (await collection.read.balanceOf([
      recipient,
      tokenId,
    ])) as bigint;
    const totalSupply = (await collection.read.totalSupply([
      tokenId,
    ])) as bigint;
    const [name] = (await collection.read.getCharacterAttributes([
      tokenId,
    ])) as [string, string, number, number, string];

    console.log(
      `  ${name} (ID: ${tokenId}): ${balance.toString()} (Total supply: ${totalSupply.toString()})`
    );

    results.push({
      tokenId: tokenId.toString(),
      name: name,
      minted: amounts[i].toString(),
      newBalance: balance.toString(),
      totalSupply: totalSupply.toString(),
    });
  }

  // Calculate total minted
  const totalMinted = amounts.reduce((sum, amt) => sum + amt, 0n);
  console.log(`\nTotal NFTs minted: ${totalMinted.toString()}`);

  // Output JSON
  console.log('\nJSON Output:');
  console.log(
    JSON.stringify(
      {
        success: true,
        txHash: txHash,
        blockNumber: receipt.blockNumber.toString(),
        collection: collectionAddress,
        recipient: recipient,
        totalMinted: totalMinted.toString(),
        characters: results,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error batch minting characters:', error);
    process.exit(1);
  });
