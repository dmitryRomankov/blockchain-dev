import { network } from 'hardhat';
import { decodeEventLog, parseAbiItem } from 'viem';

/**
 * Mint game character NFTs (single or batch)
 *
 * Usage:
 *   # Mint single character
 *   COLLECTION_ADDRESS=0x... RECIPIENT=0x... TOKEN_ID=0 AMOUNT=1 npx hardhat run scripts/mint-game-character.ts --network localhost
 *
 *   # Mint multiple of same character
 *   COLLECTION_ADDRESS=0x... RECIPIENT=0x... TOKEN_ID=0 AMOUNT=5 npx hardhat run scripts/mint-game-character.ts --network localhost
 *
 * Environment variables:
 *   COLLECTION_ADDRESS - Address of deployed GameCharacterCollection contract
 *   RECIPIENT - Address to receive the NFT
 *   TOKEN_ID - Character ID (0-9)
 *   AMOUNT - Number of tokens to mint (default: 1)
 */

async function main() {
  const networkContext = await network.connect();
  const viem = networkContext.viem;
  const publicClient = await viem.getPublicClient();
  const [owner] = await viem.getWalletClients();

  // Get parameters from environment
  const collectionAddress = process.env.COLLECTION_ADDRESS as `0x${string}`;
  const recipient = process.env.RECIPIENT as `0x${string}`;
  const tokenId = process.env.TOKEN_ID
    ? BigInt(process.env.TOKEN_ID)
    : undefined;
  const amount = process.env.AMOUNT ? BigInt(process.env.AMOUNT) : 1n;

  // Validate inputs
  if (!collectionAddress) {
    throw new Error('COLLECTION_ADDRESS environment variable is required');
  }
  if (!recipient) {
    throw new Error('RECIPIENT environment variable is required');
  }
  if (tokenId === undefined) {
    throw new Error('TOKEN_ID environment variable is required (0-9)');
  }
  if (tokenId > 9n) {
    throw new Error('TOKEN_ID must be between 0 and 9');
  }

  console.log('Minting Game Character NFT...');
  console.log('Collection:', collectionAddress);
  console.log('Recipient:', recipient);
  console.log('Token ID:', tokenId.toString());
  console.log('Amount:', amount.toString());
  console.log('Owner:', owner.account.address);

  // Get contract instance
  const collection = await viem.getContractAt(
    'GameCharacterCollection',
    collectionAddress
  );

  // Check if character is initialized
  const isInitialized = await collection.read.isCharacterInitialized([tokenId]);
  if (!isInitialized) {
    throw new Error(`Character with token ID ${tokenId} is not initialized`);
  }

  // Get character attributes
  const [name, color, speed, strength, rarity] =
    (await collection.read.getCharacterAttributes([tokenId])) as [
      string,
      string,
      number,
      number,
      string
    ];

  console.log('\nCharacter Details:');
  console.log(`  Name: ${name}`);
  console.log(`  Color: ${color}`);
  console.log(`  Speed: ${speed}`);
  console.log(`  Strength: ${strength}`);
  console.log(`  Rarity: ${rarity}`);

  // Check current balance
  const balanceBefore = (await collection.read.balanceOf([
    recipient,
    tokenId,
  ])) as bigint;
  console.log(`\nCurrent balance: ${balanceBefore.toString()}`);

  // Mint the NFT
  console.log('\nMinting...');
  const txHash = await collection.write.mint(
    [recipient, tokenId, amount, '0x'],
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

  // Check new balance
  const balanceAfter = (await collection.read.balanceOf([
    recipient,
    tokenId,
  ])) as bigint;
  console.log(`\n✅ Minting successful!`);
  console.log(`New balance: ${balanceAfter.toString()}`);
  console.log(`Minted: ${amount.toString()} ${name} NFT(s)`);

  // Get total supply
  const totalSupply = (await collection.read.totalSupply([tokenId])) as bigint;
  console.log(`Total supply of ${name}: ${totalSupply.toString()}`);

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
        character: {
          tokenId: tokenId.toString(),
          name: name,
          color: color,
          speed: speed,
          strength: strength,
          rarity: rarity,
        },
        amountMinted: amount.toString(),
        newBalance: balanceAfter.toString(),
        totalSupply: totalSupply.toString(),
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
    console.error('Error minting character:', error);
    process.exit(1);
  });
