import { network } from 'hardhat';

/**
 * Deployment script for StudentVisitCard contract
 *
 * This script deploys the soulbound ERC-721 Student Visit Card NFT contract
 *
 * Usage:
 * npx hardhat run scripts/deploy-student-card.ts --network localhost
 * npx hardhat run scripts/deploy-student-card.ts --network polygonAmoy
 */
async function main() {
  console.log('🎓 Deploying StudentVisitCard Contract...\n');

  // Connect to network and get viem instance
  const networkContext = await network.connect();
  const viem = networkContext.viem;
  const [deployer] = await viem.getWalletClients();

  console.log('Deploying with account:', deployer.account.address);

  // Base URI for metadata (update this with your IPFS CID)
  // Example: 'ipfs://QmYourCIDHere/'
  const baseURI = process.env.BASE_URI || 'ipfs://QmExampleStudentCards/';

  console.log('Base URI:', baseURI);

  // Deploy the contract
  const visitCard = await viem.deployContract('StudentVisitCard', [baseURI]);

  console.log('\n✅ StudentVisitCard deployed successfully!');
  console.log('📍 Contract Address:', visitCard.address);
  console.log('👤 Owner:', deployer.account.address);
  console.log('🔗 Base URI:', baseURI);

  // Get contract info
  const name = await visitCard.read.name();
  const symbol = await visitCard.read.symbol();
  const totalMinted = await visitCard.read.totalMinted();

  console.log('\n📋 Contract Details:');
  console.log('   Name:', name);
  console.log('   Symbol:', symbol);
  console.log('   Total Minted:', String(totalMinted));

  console.log('\n📝 Save this information:');
  console.log(
    JSON.stringify(
      {
        network: networkContext.networkName,
        contractAddress: visitCard.address,
        owner: deployer.account.address,
        baseURI: baseURI,
        name: name,
        symbol: symbol,
      },
      null,
      2
    )
  );

  console.log('\n🎉 Deployment complete!');
  console.log('\nNext steps:');
  console.log('1. Upload student metadata JSON files to IPFS');
  console.log('2. Update BASE_URI environment variable if needed');
  console.log('3. Mint visit cards to students using mint-student-card.ts');
  console.log(
    '\n   Example: CARD_ADDRESS=<address> STUDENT_ADDRESS=<address> npx hardhat run scripts/mint-student-card.ts'
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
