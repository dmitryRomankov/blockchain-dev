import '@nomicfoundation/hardhat-toolbox-viem';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { parseEther } from 'viem';
import assert from 'node:assert/strict';

describe('MyToken', async function () {
  const { viem } = await network.connect();

  it('Should deploy with correct initial supply', async function () {
    const initialSupply = parseEther('1000000');
    const [deployer] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);

    const balance = await myToken.read.balanceOf([deployer.account.address]);
    assert.equal(balance, initialSupply);
  });

  it('Should transfer tokens between accounts', async function () {
    const initialSupply = parseEther('1000000');
    const [deployer, recipient] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);
    const transferAmount = parseEther('100');

    await myToken.write.transfer([recipient.account.address, transferAmount]);

    const recipientBalance = await myToken.read.balanceOf([
      recipient.account.address,
    ]);
    const deployerBalance = await myToken.read.balanceOf([
      deployer.account.address,
    ]);

    assert.equal(recipientBalance, transferAmount);
    assert.equal(deployerBalance, initialSupply - transferAmount);
  });

  it('Should fail when sender does not have enough tokens', async function () {
    const initialSupply = parseEther('1000');
    const [_, recipient] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);
    const transferAmount = parseEther('10000');

    await assert.rejects(
      async () => {
        await myToken.write.transfer([
          recipient.account.address,
          transferAmount,
        ]);
      },
      {
        message: /ERC20InsufficientBalance/,
      }
    );
  });

  it('Should mint tokens as owner', async function () {
    const initialSupply = parseEther('1000000');
    const [_, recipient] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);
    const mintAmount = parseEther('500000');

    await myToken.write.mint([recipient.account.address, mintAmount]);

    const recipientBalance = await myToken.read.balanceOf([
      recipient.account.address,
    ]);
    const totalSupply = await myToken.read.totalSupply();

    assert.equal(recipientBalance, mintAmount);
    assert.equal(totalSupply, initialSupply + mintAmount);
  });

  it('Should fail when non-owner tries to mint', async function () {
    const initialSupply = parseEther('1000000');
    const [_, nonOwner] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);
    const mintAmount = parseEther('100');

    await assert.rejects(
      async () => {
        await myToken.write.mint([nonOwner.account.address, mintAmount], {
          account: nonOwner.account,
        });
      },
      {
        message: /OwnableUnauthorizedAccount/,
      }
    );
  });

  it('Should burn tokens from caller account', async function () {
    const initialSupply = parseEther('1000000');
    const [deployer] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);
    const burnAmount = parseEther('100000');

    await myToken.write.burn([burnAmount]);

    const balance = await myToken.read.balanceOf([deployer.account.address]);
    const totalSupply = await myToken.read.totalSupply();

    assert.equal(balance, initialSupply - burnAmount);
    assert.equal(totalSupply, initialSupply - burnAmount);
  });

  it('Should fail to burn more tokens than balance', async function () {
    const initialSupply = parseEther('1000');
    const [deployer] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);
    const burnAmount = parseEther('10000');

    await assert.rejects(
      async () => {
        await myToken.write.burn([burnAmount]);
      },
      {
        message: /ERC20InsufficientBalance/,
      }
    );
  });

  it('Should transfer zero tokens successfully', async function () {
    const initialSupply = parseEther('1000000');
    const [deployer, recipient] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);

    await myToken.write.transfer([recipient.account.address, 0n]);

    const recipientBalance = await myToken.read.balanceOf([
      recipient.account.address,
    ]);
    const deployerBalance = await myToken.read.balanceOf([
      deployer.account.address,
    ]);

    assert.equal(recipientBalance, 0n);
    assert.equal(deployerBalance, initialSupply);
  });

  it('Should handle multiple transfers correctly', async function () {
    const initialSupply = parseEther('1000000');
    const [deployer, recipient1, recipient2] = await viem.getWalletClients();

    const myToken = await viem.deployContract('MyToken', [initialSupply]);
    const amount1 = parseEther('100');
    const amount2 = parseEther('200');

    await myToken.write.transfer([recipient1.account.address, amount1]);
    await myToken.write.transfer([recipient2.account.address, amount2]);

    const balance1 = await myToken.read.balanceOf([recipient1.account.address]);
    const balance2 = await myToken.read.balanceOf([recipient2.account.address]);
    const deployerBalance = await myToken.read.balanceOf([
      deployer.account.address,
    ]);

    assert.equal(balance1, amount1);
    assert.equal(balance2, amount2);
    assert.equal(deployerBalance, initialSupply - amount1 - amount2);
  });
});
