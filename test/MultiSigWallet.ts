import { expect } from 'chai';
import { network } from 'hardhat';
import { describe, it } from 'node:test';
import { parseEther } from 'viem';
import { Transaction } from '../types.js';

describe('MultiSigWallet', () => {
  async function deployContracts() {
    const networkContext = await network.connect();
    const viem = networkContext.viem;
    const publicClient = await viem.getPublicClient();
    const [owner1, owner2, recipient, nonOwner] = await viem.getWalletClients();

    const token = await viem.deployContract('TestToken', [
      parseEther('1000000'),
    ]);

    const wallet = await viem.deployContract('MultiSigWallet', [
      [owner1.account.address, owner2.account.address],
    ]);

    await token.write.transfer([wallet.address, parseEther('10000')], {
      account: owner1.account,
    });

    return {
      token,
      wallet,
      viem,
      publicClient,
      owner1,
      owner2,
      recipient,
      nonOwner,
    };
  }

  async function getReceipt(publicClient: any, txHash: `0x${string}`) {
    return await publicClient.getTransactionReceipt({ hash: txHash });
  }

  describe('Deployment and Initialization', () => {
    it('should initialize with correct owners and threshold', async () => {
      const { wallet, owner1, owner2 } = await deployContracts();

      const owners = (await wallet.read.getOwners()) as `0x${string}`[];
      const required = (await wallet.read.numConfirmationsRequired()) as bigint;
      const isOwner1 = await wallet.read.isOwner([owner1.account.address]);
      const isOwner2 = await wallet.read.isOwner([owner2.account.address]);
      const txCount = (await wallet.read.getTransactionCount()) as bigint;

      expect(owners).to.have.lengthOf(2);
      expect(owners[0].toLowerCase()).to.equal(
        owner1.account.address.toLowerCase()
      );
      expect(owners[1].toLowerCase()).to.equal(
        owner2.account.address.toLowerCase()
      );
      expect(required).to.equal(2n);
      expect(isOwner1).to.be.true;
      expect(isOwner2).to.be.true;
      expect(txCount).to.equal(0n);
    });

    it('should reject invalid owner configurations', async () => {
      const networkContext = await network.connect();
      const viem = networkContext.viem;
      const [owner1] = await viem.getWalletClients();

      try {
        await viem.deployContract('MultiSigWallet', [[owner1.account.address]]);
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('OwnersRequired');
      }

      try {
        await viem.deployContract('MultiSigWallet', [
          [
            owner1.account.address,
            '0x0000000000000000000000000000000000000000',
          ],
        ]);
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidOwner');
      }
    });

    it('should reject duplicate owners', async () => {
      const networkContext = await network.connect();
      const viem = networkContext.viem;
      const [owner1] = await viem.getWalletClients();

      try {
        await viem.deployContract('MultiSigWallet', [
          [owner1.account.address, owner1.account.address],
        ]);
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('InvalidOwner');
      }
    });
  });

  describe('Transaction Submission', () => {
    it('should allow owner to submit transaction', async () => {
      const { wallet, token, owner1, recipient, publicClient } =
        await deployContracts();
      const amount = parseEther('100');

      const txHash = await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      const txCount = (await wallet.read.getTransactionCount()) as bigint;
      expect(txCount).to.equal(1n);

      const tx = (await wallet.read.getTransaction([0n])) as Transaction;
      expect(tx[0].toLowerCase()).to.equal(token.address.toLowerCase());
      expect(tx[1].toLowerCase()).to.equal(
        recipient.account.address.toLowerCase()
      );
      expect(tx[2]).to.equal(amount);
      expect(tx[3]).to.be.false;
      expect(tx[4]).to.equal(0n);
    });

    it('should reject submission by non-owner', async () => {
      const { wallet, token, recipient, nonOwner } = await deployContracts();
      const amount = parseEther('100');

      try {
        await wallet.write.submitTransaction(
          [token.address, recipient.account.address, amount],
          { account: nonOwner.account }
        );
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('NotOwner');
      }
    });
  });

  describe('Confirmation and Revocation', () => {
    it('should allow owners to confirm transaction', async () => {
      const { wallet, token, owner1, owner2, recipient, publicClient } =
        await deployContracts();
      const amount = parseEther('100');

      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      const txHash1 = await wallet.write.confirmTransaction([0n], {
        account: owner1.account,
      });
      const receipt1 = await getReceipt(publicClient, txHash1);
      expect(receipt1.status).to.equal('success');

      let tx = (await wallet.read.getTransaction([0n])) as Transaction;
      expect(tx[4]).to.equal(1n);

      const txHash2 = await wallet.write.confirmTransaction([0n], {
        account: owner2.account,
      });
      const receipt2 = await getReceipt(publicClient, txHash2);
      expect(receipt2.status).to.equal('success');

      tx = (await wallet.read.getTransaction([0n])) as Transaction;
      expect(tx[4]).to.equal(2n);

      const isConfirmed1 = await wallet.read.isConfirmed([
        0n,
        owner1.account.address,
      ]);
      const isConfirmed2 = await wallet.read.isConfirmed([
        0n,
        owner2.account.address,
      ]);
      expect(isConfirmed1).to.be.true;
      expect(isConfirmed2).to.be.true;
    });

    it('should allow owner to revoke confirmation', async () => {
      const { wallet, token, owner1, recipient, publicClient } =
        await deployContracts();
      const amount = parseEther('100');

      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      await wallet.write.confirmTransaction([0n], { account: owner1.account });

      const txHash = await wallet.write.revokeConfirmation([0n], {
        account: owner1.account,
      });
      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      const tx = (await wallet.read.getTransaction([0n])) as Transaction;
      expect(tx[4]).to.equal(0n);

      const isConfirmed = await wallet.read.isConfirmed([
        0n,
        owner1.account.address,
      ]);
      expect(isConfirmed).to.be.false;
    });

    it('should reject confirmation by non-owner', async () => {
      const { wallet, token, owner1, recipient, nonOwner } =
        await deployContracts();
      const amount = parseEther('100');

      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      try {
        await wallet.write.confirmTransaction([0n], {
          account: nonOwner.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('NotOwner');
      }
    });
  });

  describe('Transaction Execution', () => {
    it('should execute transaction after reaching threshold', async () => {
      const { wallet, token, owner1, owner2, recipient, publicClient } =
        await deployContracts();
      const amount = parseEther('100');

      const recipientBalanceBefore = (await token.read.balanceOf([
        recipient.account.address,
      ])) as bigint;

      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      await wallet.write.confirmTransaction([0n], {
        account: owner1.account,
      });
      await wallet.write.confirmTransaction([0n], {
        account: owner2.account,
      });

      const txHash = await wallet.write.executeTransaction([0n], {
        account: owner1.account,
      });
      const receipt = await getReceipt(publicClient, txHash);
      expect(receipt.status).to.equal('success');

      const tx = (await wallet.read.getTransaction([0n])) as Transaction;
      expect(tx[3]).to.be.true;

      const recipientBalanceAfter = (await token.read.balanceOf([
        recipient.account.address,
      ])) as bigint;
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + amount);
    });

    it('should reject execution without sufficient confirmations', async () => {
      const { wallet, token, owner1, recipient } = await deployContracts();
      const amount = parseEther('100');

      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      await wallet.write.confirmTransaction([0n], {
        account: owner1.account,
      });

      try {
        await wallet.write.executeTransaction([0n], {
          account: owner1.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('CannotExecute');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should prevent duplicate confirmations', async () => {
      const { wallet, token, owner1, recipient } = await deployContracts();
      const amount = parseEther('100');

      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      await wallet.write.confirmTransaction([0n], { account: owner1.account });

      try {
        await wallet.write.confirmTransaction([0n], {
          account: owner1.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('TxAlreadyConfirmed');
      }
    });

    it('should prevent unauthorized access', async () => {
      const { wallet, token, owner1, owner2, recipient, nonOwner } =
        await deployContracts();
      const amount = parseEther('100');

      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      await wallet.write.confirmTransaction([0n], { account: owner1.account });
      await wallet.write.confirmTransaction([0n], { account: owner2.account });

      try {
        await wallet.write.executeTransaction([0n], {
          account: nonOwner.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('NotOwner');
      }
    });

    it('should handle invalid transactions', async () => {
      const { wallet, token, owner1, recipient } = await deployContracts();
      const amount = parseEther('100');

      // First, create a transaction (but don't confirm it)
      await wallet.write.submitTransaction(
        [token.address, recipient.account.address, amount],
        { account: owner1.account }
      );

      // Test confirming a non-existent transaction
      try {
        await wallet.write.confirmTransaction([999n], {
          account: owner1.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('TxDoesNotExist');
      }

      // Test revoking a confirmation that doesn't exist
      try {
        await wallet.write.revokeConfirmation([0n], {
          account: owner1.account,
        });
        expect.fail('Should have reverted');
      } catch (error: any) {
        expect(error.message).to.include('TxNotConfirmed');
      }
    });
  });
});
