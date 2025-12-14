import { expect } from 'chai';
import { network } from 'hardhat';
import { describe, it } from 'node:test';

describe('GameCharacterCollection', () => {
  const BASE_URI = 'ipfs://QmGameCharacters/';

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

  async function deployContract() {
    const networkContext = await network.connect();
    const viem = networkContext.viem;
    const publicClient = await viem.getPublicClient();
    const [owner, player1, player2, player3] = await viem.getWalletClients();

    const collection = await viem.deployContract('GameCharacterCollection', [
      BASE_URI,
    ]);

    return {
      collection,
      viem,
      publicClient,
      owner,
      player1,
      player2,
      player3,
    };
  }

  async function deployAndInitialize() {
    const context = await deployContract();
    const { collection, owner } = context;

    // Initialize all 10 characters
    for (const char of CHARACTERS) {
      await collection.write.initializeCharacter(
        [
          BigInt(char.id),
          char.name,
          char.color,
          char.speed,
          char.strength,
          char.rarity,
        ],
        { account: owner.account }
      );
    }

    return context;
  }

  async function getReceipt(publicClient: any, txHash: `0x${string}`) {
    return await publicClient.getTransactionReceipt({ hash: txHash });
  }

  describe('Deployment', () => {
    it('should deploy with correct base URI', async () => {
      const { collection } = await deployContract();

      const baseURI = await collection.read.baseURI();
      expect(baseURI).to.equal(BASE_URI);
    });

    it('should set the deployer as owner', async () => {
      const { collection, owner } = await deployContract();

      const contractOwner = await collection.read.owner();
      expect(String(contractOwner).toLowerCase()).to.equal(
        owner.account.address.toLowerCase()
      );
    });

    it('should have correct constants', async () => {
      const { collection } = await deployContract();

      const maxTokenId = (await collection.read.MAX_TOKEN_ID()) as bigint;
      const totalCharacters =
        (await collection.read.TOTAL_CHARACTERS()) as bigint;

      expect(maxTokenId).to.equal(9n);
      expect(totalCharacters).to.equal(10n);
    });
  });

  describe('Character Initialization', () => {
    it('should allow owner to initialize characters', async () => {
      const { collection, owner, publicClient } = await deployContract();
      const char = CHARACTERS[0];

      const txHash = await collection.write.initializeCharacter(
        [
          BigInt(char.id),
          char.name,
          char.color,
          char.speed,
          char.strength,
          char.rarity,
        ],
        { account: owner.account }
      );

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      // Verify character data
      const [name, color, speed, strength, rarity] =
        (await collection.read.getCharacterAttributes([BigInt(char.id)])) as [
          string,
          string,
          number,
          number,
          string
        ];

      expect(name).to.equal(char.name);
      expect(color).to.equal(char.color);
      expect(speed).to.equal(char.speed);
      expect(strength).to.equal(char.strength);
      expect(rarity).to.equal(char.rarity);
    });

    it('should mark character as initialized', async () => {
      const { collection, owner } = await deployContract();
      const char = CHARACTERS[0];

      await collection.write.initializeCharacter(
        [
          BigInt(char.id),
          char.name,
          char.color,
          char.speed,
          char.strength,
          char.rarity,
        ],
        { account: owner.account }
      );

      const isInitialized = await collection.read.isCharacterInitialized([
        BigInt(char.id),
      ]);
      expect(isInitialized).to.be.true;
    });

    it('should prevent non-owner from initializing', async () => {
      const { collection, player1 } = await deployContract();
      const char = CHARACTERS[0];

      try {
        await collection.write.initializeCharacter(
          [
            BigInt(char.id),
            char.name,
            char.color,
            char.speed,
            char.strength,
            char.rarity,
          ],
          { account: player1.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('OwnableUnauthorizedAccount');
      }
    });

    it('should reject invalid token IDs', async () => {
      const { collection, owner } = await deployContract();

      try {
        await collection.write.initializeCharacter(
          [10n, 'Invalid', 'Red', 50, 50, 'Common'],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidTokenId');
      }
    });

    it('should reject invalid attribute values', async () => {
      const { collection, owner } = await deployContract();

      // Speed = 0
      try {
        await collection.write.initializeCharacter(
          [0n, 'Test', 'Red', 0, 50, 'Common'],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidQuantity');
      }

      // Speed > 100
      try {
        await collection.write.initializeCharacter(
          [0n, 'Test', 'Red', 101, 50, 'Common'],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidQuantity');
      }
    });
  });

  describe('Single Minting', () => {
    it('should allow owner to mint single character', async () => {
      const { collection, owner, player1, publicClient } =
        await deployAndInitialize();

      const txHash = await collection.write.mint(
        [player1.account.address, 0n, 1n, '0x'],
        { account: owner.account }
      );

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      const balance = (await collection.read.balanceOf([
        player1.account.address,
        0n,
      ])) as bigint;
      expect(balance).to.equal(1n);
    });

    it('should mint multiple quantities of same character', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      await collection.write.mint([player1.account.address, 1n, 5n, '0x'], {
        account: owner.account,
      });

      const balance = (await collection.read.balanceOf([
        player1.account.address,
        1n,
      ])) as bigint;
      expect(balance).to.equal(5n);
    });

    it('should track total supply', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      await collection.write.mint([player1.account.address, 2n, 3n, '0x'], {
        account: owner.account,
      });

      const totalSupply = (await collection.read.totalSupply([2n])) as bigint;
      expect(totalSupply).to.equal(3n);
    });

    it('should prevent minting uninitialized character', async () => {
      const { collection, owner, player1 } = await deployContract();

      try {
        await collection.write.mint([player1.account.address, 0n, 1n, '0x'], {
          account: owner.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('CharacterNotInitialized');
      }
    });

    it('should prevent non-owner from minting', async () => {
      const { collection, player1 } = await deployAndInitialize();

      try {
        await collection.write.mint([player1.account.address, 0n, 1n, '0x'], {
          account: player1.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('OwnableUnauthorizedAccount');
      }
    });
  });

  describe('Batch Minting', () => {
    it('should allow batch minting multiple characters', async () => {
      const { collection, owner, player1, publicClient } =
        await deployAndInitialize();

      const tokenIds = [0n, 1n, 2n];
      const amounts = [2n, 3n, 1n];

      const txHash = await collection.write.mintBatch(
        [player1.account.address, tokenIds, amounts, '0x'],
        { account: owner.account }
      );

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      // Check balances
      for (let i = 0; i < tokenIds.length; i++) {
        const balance = (await collection.read.balanceOf([
          player1.account.address,
          tokenIds[i],
        ])) as bigint;
        expect(balance).to.equal(amounts[i]);
      }
    });

    it('should update total supply for all tokens', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      const tokenIds = [3n, 4n, 5n];
      const amounts = [5n, 10n, 7n];

      await collection.write.mintBatch(
        [player1.account.address, tokenIds, amounts, '0x'],
        { account: owner.account }
      );

      for (let i = 0; i < tokenIds.length; i++) {
        const supply = (await collection.read.totalSupply([
          tokenIds[i],
        ])) as bigint;
        expect(supply).to.equal(amounts[i]);
      }
    });

    it('should reject mismatched array lengths', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      try {
        await collection.write.mintBatch(
          [player1.account.address, [0n, 1n], [1n], '0x'],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidArrayLength');
      }
    });

    it('should reject empty arrays', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      try {
        await collection.write.mintBatch(
          [player1.account.address, [], [], '0x'],
          { account: owner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidQuantity');
      }
    });
  });

  describe('Transfers', () => {
    it('should allow single token transfer', async () => {
      const { collection, owner, player1, player2 } =
        await deployAndInitialize();

      // Mint to player1
      await collection.write.mint([player1.account.address, 0n, 5n, '0x'], {
        account: owner.account,
      });

      // Transfer from player1 to player2
      await collection.write.safeTransferFrom(
        [player1.account.address, player2.account.address, 0n, 2n, '0x'],
        { account: player1.account }
      );

      const balance1 = (await collection.read.balanceOf([
        player1.account.address,
        0n,
      ])) as bigint;
      const balance2 = (await collection.read.balanceOf([
        player2.account.address,
        0n,
      ])) as bigint;

      expect(balance1).to.equal(3n);
      expect(balance2).to.equal(2n);
    });

    it('should allow batch transfers', async () => {
      const { collection, owner, player1, player2 } =
        await deployAndInitialize();

      // Mint multiple tokens to player1
      await collection.write.mintBatch(
        [player1.account.address, [0n, 1n, 2n], [10n, 8n, 6n], '0x'],
        { account: owner.account }
      );

      // Batch transfer from player1 to player2
      await collection.write.safeBatchTransferFrom(
        [
          player1.account.address,
          player2.account.address,
          [0n, 1n, 2n],
          [3n, 2n, 1n],
          '0x',
        ],
        { account: player1.account }
      );

      // Verify balances
      const balance0_p1 = (await collection.read.balanceOf([
        player1.account.address,
        0n,
      ])) as bigint;
      const balance0_p2 = (await collection.read.balanceOf([
        player2.account.address,
        0n,
      ])) as bigint;

      expect(balance0_p1).to.equal(7n);
      expect(balance0_p2).to.equal(3n);
    });

    it('should support approvals', async () => {
      const { collection, owner, player1, player2 } =
        await deployAndInitialize();

      await collection.write.mint([player1.account.address, 0n, 5n, '0x'], {
        account: owner.account,
      });

      // Player1 approves player2
      await collection.write.setApprovalForAll(
        [player2.account.address, true],
        {
          account: player1.account,
        }
      );

      const isApproved = await collection.read.isApprovedForAll([
        player1.account.address,
        player2.account.address,
      ]);
      expect(isApproved).to.be.true;

      // Player2 can transfer on behalf of player1
      await collection.write.safeTransferFrom(
        [player1.account.address, player2.account.address, 0n, 2n, '0x'],
        { account: player2.account }
      );

      const balance2 = (await collection.read.balanceOf([
        player2.account.address,
        0n,
      ])) as bigint;
      expect(balance2).to.equal(2n);
    });
  });

  describe('Burning', () => {
    it('should allow owner to burn their tokens', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      await collection.write.mint([player1.account.address, 0n, 5n, '0x'], {
        account: owner.account,
      });

      await collection.write.burn([player1.account.address, 0n, 2n], {
        account: player1.account,
      });

      const balance = (await collection.read.balanceOf([
        player1.account.address,
        0n,
      ])) as bigint;
      expect(balance).to.equal(3n);

      const supply = (await collection.read.totalSupply([0n])) as bigint;
      expect(supply).to.equal(3n);
    });

    it('should allow batch burning', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      await collection.write.mintBatch(
        [player1.account.address, [0n, 1n, 2n], [5n, 4n, 3n], '0x'],
        { account: owner.account }
      );

      await collection.write.burnBatch(
        [player1.account.address, [0n, 1n, 2n], [1n, 1n, 1n]],
        { account: player1.account }
      );

      const balance0 = (await collection.read.balanceOf([
        player1.account.address,
        0n,
      ])) as bigint;
      const balance1 = (await collection.read.balanceOf([
        player1.account.address,
        1n,
      ])) as bigint;
      const balance2 = (await collection.read.balanceOf([
        player1.account.address,
        2n,
      ])) as bigint;

      expect(balance0).to.equal(4n);
      expect(balance1).to.equal(3n);
      expect(balance2).to.equal(2n);
    });
  });

  describe('Query Functions', () => {
    it('should return correct token URI', async () => {
      const { collection, owner } = await deployAndInitialize();

      const uri0 = await collection.read.uri([0n]);
      const uri5 = await collection.read.uri([5n]);
      const uri9 = await collection.read.uri([9n]);

      expect(uri0).to.equal(`${BASE_URI}0.json`);
      expect(uri5).to.equal(`${BASE_URI}5.json`);
      expect(uri9).to.equal(`${BASE_URI}9.json`);
    });

    it('should return owned tokens with balances', async () => {
      const { collection, owner, player1 } = await deployAndInitialize();

      await collection.write.mintBatch(
        [player1.account.address, [0n, 3n, 7n], [2n, 5n, 1n], '0x'],
        { account: owner.account }
      );

      const [tokenIds, balances] = (await collection.read.getOwnedTokens([
        player1.account.address,
      ])) as [bigint[], bigint[]];

      expect(tokenIds).to.have.lengthOf(3);
      expect(tokenIds[0]).to.equal(0n);
      expect(tokenIds[1]).to.equal(3n);
      expect(tokenIds[2]).to.equal(7n);

      expect(balances[0]).to.equal(2n);
      expect(balances[1]).to.equal(5n);
      expect(balances[2]).to.equal(1n);
    });

    it('should check character initialization', async () => {
      const { collection, owner } = await deployContract();

      const before = await collection.read.isCharacterInitialized([0n]);
      expect(before).to.be.false;

      await collection.write.initializeCharacter(
        [0n, 'Test', 'Red', 50, 50, 'Common'],
        { account: owner.account }
      );

      const after = await collection.read.isCharacterInitialized([0n]);
      expect(after).to.be.true;
    });
  });

  describe('Base URI Management', () => {
    it('should allow owner to update base URI', async () => {
      const { collection, owner, publicClient } = await deployAndInitialize();

      const newURI = 'ipfs://QmNewHash/';
      const txHash = await collection.write.setBaseURI([newURI], {
        account: owner.account,
      });

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      const baseURI = await collection.read.baseURI();
      expect(baseURI).to.equal(newURI);

      const tokenURI = await collection.read.uri([0n]);
      expect(tokenURI).to.equal(`${newURI}0.json`);
    });

    it('should prevent non-owner from updating base URI', async () => {
      const { collection, player1 } = await deployAndInitialize();

      try {
        await collection.write.setBaseURI(['ipfs://QmNewHash/'], {
          account: player1.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('OwnableUnauthorizedAccount');
      }
    });
  });
});
