import { network } from 'hardhat';

/**
 * Script to query Student Visit Card information
 *
 * Usage:
 * CARD_ADDRESS=0x... TOKEN_ID=1 npx hardhat run scripts/query-student-card.ts --network localhost
 * or
 * CARD_ADDRESS=0x... STUDENT_ADDRESS=0x... npx hardhat run scripts/query-student-card.ts --network localhost
 */
async function main() {
  console.log('🔍 Querying Student Visit Card...\n');

  // Get environment variables
  const cardAddress = process.env.CARD_ADDRESS;
  const tokenIdStr = process.env.TOKEN_ID;
  const studentAddress = process.env.STUDENT_ADDRESS;

  if (!cardAddress) {
    console.error('❌ Missing CARD_ADDRESS environment variable!');
    console.error('\nUsage:');
    console.error(
      'CARD_ADDRESS=0x... TOKEN_ID=1 npx hardhat run scripts/query-student-card.ts'
    );
    console.error('or');
    console.error(
      'CARD_ADDRESS=0x... STUDENT_ADDRESS=0x... npx hardhat run scripts/query-student-card.ts'
    );
    process.exit(1);
  }

  // Connect to network
  const networkContext = await network.connect();
  const viem = networkContext.viem;

  console.log('Contract Address:', cardAddress);

  // Get contract instance
  const visitCard = await viem.getContractAt(
    'StudentVisitCard',
    cardAddress as `0x${string}`
  );

  // Get contract details
  const name = await visitCard.read.name();
  const symbol = await visitCard.read.symbol();
  const totalMinted = await visitCard.read.totalMinted();

  console.log('\n📋 Contract Information:');
  console.log('   Name:', name);
  console.log('   Symbol:', symbol);
  console.log('   Total Minted:', String(totalMinted));

  let tokenId: bigint;

  // Determine token ID
  if (studentAddress) {
    console.log('\n👤 Looking up student:', studentAddress);
    const hasCard = await visitCard.read.hasVisitCard([
      studentAddress as `0x${string}`,
    ]);

    if (!hasCard) {
      console.error('❌ Student does not have a visit card');
      process.exit(1);
    }

    tokenId = (await visitCard.read.getTokenByStudent([
      studentAddress as `0x${string}`,
    ])) as bigint;
    console.log('   Token ID:', tokenId.toString());
  } else if (tokenIdStr) {
    tokenId = BigInt(tokenIdStr);
    console.log('\n🎫 Token ID:', tokenId.toString());
  } else {
    console.error('❌ Must provide either TOKEN_ID or STUDENT_ADDRESS');
    process.exit(1);
  }

  // Get token owner
  try {
    const owner = await visitCard.read.ownerOf([tokenId]);
    console.log('\n👤 Token Owner:', owner);

    // Get student data
    const [studentName, studentID, course, year] =
      (await visitCard.read.getStudentData([tokenId])) as [
        string,
        string,
        string,
        number
      ];

    console.log('\n🎓 Student Information:');
    console.log('   Name:', studentName);
    console.log('   Student ID:', studentID);
    console.log('   Course:', course);
    console.log('   Year:', year);

    // Get token URI
    const tokenURI = await visitCard.read.tokenURI([tokenId]);
    console.log('\n📄 Metadata:');
    console.log('   Token URI:', tokenURI);

    // Check approval status
    const approved = await visitCard.read.getApproved([tokenId]);
    console.log('\n🔒 Soulbound Status:');
    console.log('   Approved Address:', approved);
    console.log('   Is Soulbound: ✅ (Cannot be transferred or approved)');

    console.log('\n✅ Query complete!');
  } catch (error: any) {
    if (error.message.includes('ERC721NonexistentToken')) {
      console.error(`\n❌ Token ID ${tokenId} does not exist`);
    } else {
      console.error('\n❌ Query failed:', error.message);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Query failed:', error);
    process.exit(1);
  });
