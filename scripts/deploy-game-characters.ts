import { network } from 'hardhat';

/**
 * Deploy GameCharacterCollection contract and initialize all 10 characters
 *
 * Usage:
 *   BASE_URI=ipfs://QmGameCharacters/ npx hardhat run scripts/deploy-game-characters.ts --network localhost
 *   BASE_URI=ipfs://QmGameCharacters/ npx hardhat run scripts/deploy-game-characters.ts --network amoy
 *
 * Environment variables:
 *   BASE_URI - Base URI for metadata (default: ipfs://QmGameCharacters/)
 */

async function main() {
  const networkContext = await network.connect();
  const viem = networkContext.viem;
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  console.log('Deploying GameCharacterCollection...');
  console.log('Deployer address:', deployer.account.address);

  // Get base URI from environment or use default
  const baseURI = process.env.BASE_URI || 'ipfs://QmGameCharacters/';
  console.log('Base URI:', baseURI);

  // Deploy the contract
  const collection = await viem.deployContract('GameCharacterCollection', [
    baseURI,
  ]);

  console.log('✅ GameCharacterCollection deployed to:', collection.address);

  // Character data
  const CHARACTERS = [
    {
      id: 0,
      name: 'Fire Dragon',
      color: 'Red',
      speed: 85,
      strength: 95,
      rarity: 'Legendary',
    },
    {
      id: 1,
      name: 'Ice Mage',
      color: 'Blue',
      speed: 70,
      strength: 80,
      rarity: 'Epic',
    },
    {
      id: 2,
      name: 'Forest Elf',
      color: 'Green',
      speed: 90,
      strength: 65,
      rarity: 'Rare',
    },
    {
      id: 3,
      name: 'Shadow Assassin',
      color: 'Black',
      speed: 95,
      strength: 70,
      rarity: 'Epic',
    },
    {
      id: 4,
      name: 'Light Paladin',
      color: 'Gold',
      speed: 60,
      strength: 90,
      rarity: 'Legendary',
    },
    {
      id: 5,
      name: 'Wind Archer',
      color: 'Silver',
      speed: 88,
      strength: 75,
      rarity: 'Rare',
    },
    {
      id: 6,
      name: 'Earth Golem',
      color: 'Brown',
      speed: 40,
      strength: 100,
      rarity: 'Epic',
    },
    {
      id: 7,
      name: 'Lightning Warrior',
      color: 'Yellow',
      speed: 92,
      strength: 85,
      rarity: 'Legendary',
    },
    {
      id: 8,
      name: 'Water Healer',
      color: 'Cyan',
      speed: 65,
      strength: 55,
      rarity: 'Rare',
    },
    {
      id: 9,
      name: 'Void Sorcerer',
      color: 'Purple',
      speed: 75,
      strength: 88,
      rarity: 'Epic',
    },
  ];

  console.log('\nInitializing characters...');

  // Initialize all 10 characters
  for (const char of CHARACTERS) {
    console.log(`Initializing ${char.name} (ID: ${char.id})...`);

    const txHash = await collection.write.initializeCharacter(
      [
        BigInt(char.id),
        char.name,
        char.color,
        char.speed,
        char.strength,
        char.rarity,
      ],
      {
        account: deployer.account,
      }
    );

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`  ✅ ${char.name} initialized (tx: ${txHash})`);
  }

  console.log('\n✅ All characters initialized successfully!');
  console.log('\nDeployment Summary:');
  console.log('====================');
  console.log('Contract Address:', collection.address);
  console.log('Base URI:', baseURI);
  console.log('Network:', networkContext.networkName);
  console.log('Deployer:', deployer.account.address);
  console.log('Characters Initialized: 10');

  // Output JSON for easy reference
  console.log('\nJSON Output:');
  console.log(
    JSON.stringify(
      {
        contract: 'GameCharacterCollection',
        address: collection.address,
        baseURI: baseURI,
        network: networkContext.networkName,
        deployer: deployer.account.address,
        characters: CHARACTERS.length,
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
    console.error('Error during deployment:', error);
    process.exit(1);
  });
