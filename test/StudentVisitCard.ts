import { expect } from 'chai';
import { network } from 'hardhat';
import { describe, it } from 'node:test';

describe('StudentVisitCard', () => {
  const BASE_URI = 'ipfs://QmExample123456789/';
  const STUDENT_NAME = 'Alice Johnson';
  const STUDENT_ID = 'STU2025001';
  const COURSE = 'Computer Science';
  const YEAR = 2025;

  async function deployContract() {
    const networkContext = await network.connect();
    const viem = networkContext.viem;
    const publicClient = await viem.getPublicClient();
    const [owner, student1, student2, student3, nonOwner] =
      await viem.getWalletClients();

    const visitCard = await viem.deployContract('StudentVisitCard', [BASE_URI]);

    return {
      visitCard,
      viem,
      publicClient,
      owner,
      student1,
      student2,
      student3,
      nonOwner,
    };
  }

  async function getReceipt(publicClient: any, txHash: `0x${string}`) {
    return await publicClient.getTransactionReceipt({ hash: txHash });
  }

  describe('Deployment', () => {
    it('should deploy with correct name and symbol', async () => {
      const { visitCard } = await deployContract();

      const name = await visitCard.read.name();
      const symbol = await visitCard.read.symbol();

      expect(name).to.equal('Student Visit Card');
      expect(symbol).to.equal('SVC');
    });

    it('should set the correct base URI', async () => {
      const { visitCard, owner, student1, publicClient } =
        await deployContract();

      // Mint a token to check URI
      const txHash = await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      const tokenURI = await visitCard.read.tokenURI([1n]);
      expect(tokenURI).to.equal(`${BASE_URI}1.json`);
    });

    it('should set the deployer as owner', async () => {
      const { visitCard, owner } = await deployContract();

      const contractOwner = await visitCard.read.owner();
      expect(String(contractOwner).toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
    });
  });

  describe('Minting', () => {
    it('should allow owner to mint visit card', async () => {
      const { visitCard, owner, student1, publicClient } =
        await deployContract();

      const txHash = await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      // Verify token ownership
      const tokenOwner = await visitCard.read.ownerOf([1n]);
      expect(String(tokenOwner).toLowerCase()).to.equal(
        student1.account.address.toLowerCase()
      );

      // Verify student data
      const [name, id, course, year] = (await visitCard.read.getStudentData([
        1n,
      ])) as [string, string, string, number];

      expect(name).to.equal(STUDENT_NAME);
      expect(id).to.equal(STUDENT_ID);
      expect(course).to.equal(COURSE);
      expect(year).to.equal(YEAR);
    });

    it('should increment token ID for multiple mints', async () => {
      const { visitCard, owner, student1, student2, student3 } =
        await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, 'Student 1', 'ID001', 'CS', 2025],
        { account: owner.account }
      );

      await visitCard.write.mintVisitCard(
        [student2.account.address, 'Student 2', 'ID002', 'Math', 2024],
        { account: owner.account }
      );

      await visitCard.write.mintVisitCard(
        [student3.account.address, 'Student 3', 'ID003', 'Physics', 2023],
        { account: owner.account }
      );

      const totalMinted = (await visitCard.read.totalMinted()) as bigint;
      expect(totalMinted).to.equal(3n);

      // Check each owner
      const owner1 = await visitCard.read.ownerOf([1n]);
      const owner2 = await visitCard.read.ownerOf([2n]);
      const owner3 = await visitCard.read.ownerOf([3n]);

      expect(String(owner1).toLowerCase()).to.equal(
        student1.account.address.toLowerCase()
      );
      expect(String(owner2).toLowerCase()).to.equal(
        student2.account.address.toLowerCase()
      );
      expect(String(owner3).toLowerCase()).to.equal(
        student3.account.address.toLowerCase()
      );
    });

    it('should prevent non-owner from minting', async () => {
      const { visitCard, student1, nonOwner } = await deployContract();

      try {
        await visitCard.write.mintVisitCard(
          [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
          { account: nonOwner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('OwnableUnauthorizedAccount');
      }
    });

    it('should prevent minting duplicate visit card to same address', async () => {
      const { visitCard, owner, student1 } = await deployContract();

      // First mint succeeds
      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      // Second mint to same address should fail
      try {
        await visitCard.write.mintVisitCard(
          [
            student1.account.address,
            'Another Name',
            'Another ID',
            'Another Course',
            2024,
          ],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('AlreadyHasVisitCard');
      }
    });

    it('should prevent minting with invalid data', async () => {
      const { visitCard, owner, student1 } = await deployContract();

      // Empty student name
      try {
        await visitCard.write.mintVisitCard(
          [student1.account.address, '', STUDENT_ID, COURSE, YEAR],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidStudentData');
      }

      // Empty student ID
      try {
        await visitCard.write.mintVisitCard(
          [student1.account.address, STUDENT_NAME, '', COURSE, YEAR],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidStudentData');
      }

      // Empty course
      try {
        await visitCard.write.mintVisitCard(
          [student1.account.address, STUDENT_NAME, STUDENT_ID, '', YEAR],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidStudentData');
      }

      // Zero year
      try {
        await visitCard.write.mintVisitCard(
          [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, 0],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidStudentData');
      }
    });
  });

  describe('Soulbound Enforcement', () => {
    it('should prevent token transfer', async () => {
      const { visitCard, owner, student1, student2 } = await deployContract();

      // Mint token to student1
      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      // Attempt to transfer from student1 to student2
      try {
        await visitCard.write.transferFrom(
          [student1.account.address, student2.account.address, 1n],
          { account: student1.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('TransferNotAllowed');
      }
    });

    it('should prevent safe transfer', async () => {
      const { visitCard, owner, student1, student2 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      try {
        await visitCard.write['safeTransferFrom(address,address,uint256)'](
          [student1.account.address, student2.account.address, 1n],
          { account: student1.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('TransferNotAllowed');
      }
    });

    it('should prevent approvals', async () => {
      const { visitCard, owner, student1, student2 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      try {
        await visitCard.write.approve([student2.account.address, 1n], {
          account: student1.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('ApprovalNotAllowed');
      }
    });

    it('should prevent operator approvals', async () => {
      const { visitCard, owner, student1, student2 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      try {
        await visitCard.write.setApprovalForAll(
          [student2.account.address, true],
          {
            account: student1.account,
          }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('ApprovalNotAllowed');
      }
    });

    it('should return zero address for approved', async () => {
      const { visitCard, owner, student1 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const approved = await visitCard.read.getApproved([1n]);
      expect(approved).to.equal('0x0000000000000000000000000000000000000000');
    });

    it('should return false for operator approval', async () => {
      const { visitCard, owner, student1, student2 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const isApproved = await visitCard.read.isApprovedForAll([
        student1.account.address,
        student2.account.address,
      ]);
      expect(isApproved).to.be.false;
    });
  });

  describe('Query Functions', () => {
    it('should return correct student data', async () => {
      const { visitCard, owner, student1 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const [name, id, course, year] = (await visitCard.read.getStudentData([
        1n,
      ])) as [string, string, string, number];

      expect(name).to.equal(STUDENT_NAME);
      expect(id).to.equal(STUDENT_ID);
      expect(course).to.equal(COURSE);
      expect(year).to.equal(YEAR);
    });

    it('should return token by student address', async () => {
      const { visitCard, owner, student1 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const tokenId = (await visitCard.read.getTokenByStudent([
        student1.account.address,
      ])) as bigint;
      expect(tokenId).to.equal(1n);
    });

    it('should check if student has visit card', async () => {
      const { visitCard, owner, student1, student2 } = await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const hasCard1 = await visitCard.read.hasVisitCard([
        student1.account.address,
      ]);
      const hasCard2 = await visitCard.read.hasVisitCard([
        student2.account.address,
      ]);

      expect(hasCard1).to.be.true;
      expect(hasCard2).to.be.false;
    });

    it('should revert when querying non-existent token data', async () => {
      const { visitCard } = await deployContract();

      try {
        await visitCard.read.getStudentData([999n]);
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('StudentNotFound');
      }
    });

    it('should revert when querying token by unminted student', async () => {
      const { visitCard, student1 } = await deployContract();

      try {
        await visitCard.read.getTokenByStudent([student1.account.address]);
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('NoVisitCardMinted');
      }
    });
  });

  describe('Base URI Management', () => {
    it('should allow owner to update base URI', async () => {
      const { visitCard, owner, student1, publicClient } =
        await deployContract();

      await visitCard.write.mintVisitCard(
        [student1.account.address, STUDENT_NAME, STUDENT_ID, COURSE, YEAR],
        { account: owner.account }
      );

      const newBaseURI = 'ipfs://QmNewHash/';
      const txHash = await visitCard.write.setBaseURI([newBaseURI], {
        account: owner.account,
      });

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      const tokenURI = await visitCard.read.tokenURI([1n]);
      expect(tokenURI).to.equal(`${newBaseURI}1.json`);
    });

    it('should prevent non-owner from updating base URI', async () => {
      const { visitCard, nonOwner } = await deployContract();

      try {
        await visitCard.write.setBaseURI(['ipfs://QmNewHash/'], {
          account: nonOwner.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('OwnableUnauthorizedAccount');
      }
    });
  });
});
