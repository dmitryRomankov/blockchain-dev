import { network } from 'hardhat';
import { decodeEventLog, parseAbiItem } from 'viem';

/**
 * Script to mint a Student Visit Card NFT
 *
 * Usage:
 * CARD_ADDRESS=0x... STUDENT_ADDRESS=0x... STUDENT_NAME="Alice Johnson" \
 * STUDENT_ID="STU2025001" COURSE="Computer Science" YEAR=2025 \
 * npx hardhat run scripts/mint-student-card.ts --network localhost
 */
async function main() {
  console.log('🎓 Minting Student Visit Card...\n');

  // Get environment variables
  const cardAddress = process.env.CARD_ADDRESS;
  const studentAddress = process.env.STUDENT_ADDRESS;
  const studentName = process.env.STUDENT_NAME;
  const studentID = process.env.STUDENT_ID;
  const course = process.env.COURSE;
  const yearStr = process.env.YEAR;

  // Validate inputs
  if (
    !cardAddress ||
    !studentAddress ||
    !studentName ||
    !studentID ||
    !course ||
    !yearStr
  ) {
    console.error('❌ Missing required environment variables!');
    console.error('\nRequired:');
    console.error('  CARD_ADDRESS      - StudentVisitCard contract address');
    console.error('  STUDENT_ADDRESS   - Student wallet address');
    console.error('  STUDENT_NAME      - Full name of student');
    console.error('  STUDENT_ID        - Unique student ID');
    console.error('  COURSE            - Course/Major');
    console.error('  YEAR              - Academic year (number)');
    console.error('\nExample:');
    console.error('CARD_ADDRESS=0x123... STUDENT_ADDRESS=0xabc... \\');
    console.error('STUDENT_NAME="Alice Johnson" STUDENT_ID="STU2025001" \\');
    console.error('COURSE="Computer Science" YEAR=2025 \\');
    console.error(
      'npx hardhat run scripts/mint-student-card.ts --network localhost'
    );
    process.exit(1);
  }

  const year = parseInt(yearStr);
  if (isNaN(year) || year <= 0) {
    console.error('❌ YEAR must be a positive number');
    process.exit(1);
  }

  // Connect to network
  const networkContext = await network.connect();
  const viem = networkContext.viem;
  const [owner] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log('Minting with account:', owner.account.address);
  console.log('Contract Address:', cardAddress);
  console.log('\nStudent Details:');
  console.log('  Address:', studentAddress);
  console.log('  Name:', studentName);
  console.log('  ID:', studentID);
  console.log('  Course:', course);
  console.log('  Year:', year);

  // Get contract instance
  const visitCard = await viem.getContractAt(
    'StudentVisitCard',
    cardAddress as `0x${string}`
  );

  // Check if student already has a visit card
  const hasCard = await visitCard.read.hasVisitCard([
    studentAddress as `0x${string}`,
  ]);
  if (hasCard) {
    console.error('\n❌ Student already has a visit card!');
    const tokenId = await visitCard.read.getTokenByStudent([
      studentAddress as `0x${string}`,
    ]);
    console.error('   Token ID:', String(tokenId));
    process.exit(1);
  }

  console.log('\n⏳ Minting visit card...');

  // Mint the visit card
  const txHash = await visitCard.write.mintVisitCard(
    [studentAddress as `0x${string}`, studentName, studentID, course, year],
    { account: owner.account }
  );

  console.log('Transaction hash:', txHash);

  // Wait for confirmation
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

  if (receipt.status === 'success') {
    console.log('\n✅ Visit card minted successfully!');

    // Parse the event to get token ID
    const mintEvent = receipt.logs.find((log) => {
      try {
        const event = decodeEventLog({
          abi: [
            parseAbiItem(
              'event VisitCardMinted(address indexed student, uint256 indexed tokenId, string studentName, string studentID, string course, uint16 year)'
            ),
          ],
          data: log.data,
          topics: log.topics,
        });
        return event.eventName === 'VisitCardMinted';
      } catch {
        return false;
      }
    });

    if (mintEvent) {
      const decodedEvent = decodeEventLog({
        abi: [
          parseAbiItem(
            'event VisitCardMinted(address indexed student, uint256 indexed tokenId, string studentName, string studentID, string course, uint16 year)'
          ),
        ],
        data: mintEvent.data,
        topics: mintEvent.topics,
      });

      const tokenId = decodedEvent.args.tokenId;
      console.log('\n🎫 Token ID:', tokenId.toString());

      // Get token URI
      const tokenURI = await visitCard.read.tokenURI([tokenId]);
      console.log('📄 Token URI:', tokenURI);

      // Verify ownership
      const tokenOwner = await visitCard.read.ownerOf([tokenId]);
      console.log('👤 Token Owner:', tokenOwner);

      // Get total minted
      const totalMinted = await visitCard.read.totalMinted();
      console.log('\n📊 Total Visit Cards Minted:', String(totalMinted));
    }

    console.log('\n🎉 Minting complete!');
    console.log(
      '\n⚠️  Remember: This is a soulbound token and cannot be transferred!'
    );
  } else {
    console.error('\n❌ Transaction failed!');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Minting failed:', error);
    process.exit(1);
  });
