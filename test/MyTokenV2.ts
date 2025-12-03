import '@nomicfoundation/hardhat-toolbox-viem';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { parseEther, encodeFunctionData } from 'viem';
import assert from 'node:assert/strict';

describe('MyTokenV2 Upgrade', async function () {
  const { viem } = await network.connect();

  async function deployV1Token(initialSupply: bigint) {
    const implementation = await viem.deployContract('MyToken');
    const initializeData = encodeFunctionData({
      abi: [
        {
          inputs: [
            { internalType: 'uint256', name: 'initialSupply', type: 'uint256' },
          ],
          name: 'initialize',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'initialize',
      args: [initialSupply],
    });
    const proxy = await viem.deployContract('MyTokenProxy', [
      implementation.address,
      initializeData,
    ]);
    return {
      proxy,
      token: await viem.getContractAt('MyToken', proxy.address),
    };
  }

  it('Should upgrade from V1 to V2 and add version function', async function () {
    const initialSupply = parseEther('1000000');
    const [owner] = await viem.getWalletClients();

    // Deploy V1
    const { proxy, token: tokenV1 } = await deployV1Token(initialSupply);

    // Check V1 balance
    const balanceBeforeUpgrade = await tokenV1.read.balanceOf([
      owner.account.address,
    ]);
    assert.equal(balanceBeforeUpgrade, initialSupply);

    // Deploy V2 implementation
    const implementationV2 = await viem.deployContract('MyTokenV2');

    // Upgrade to V2
    await tokenV1.write.upgradeToAndCall([implementationV2.address, '0x']);

    // Get V2 contract instance at same proxy address
    const tokenV2 = await viem.getContractAt('MyTokenV2', proxy.address);

    // Verify version function exists and returns "V2"
    const version = await tokenV2.read.version();
    assert.equal(version, 'V2');

    // Verify state was preserved
    const balanceAfterUpgrade = await tokenV2.read.balanceOf([
      owner.account.address,
    ]);
    assert.equal(balanceAfterUpgrade, initialSupply);

    // Verify all original functions still work
    const name = await tokenV2.read.name();
    const symbol = await tokenV2.read.symbol();
    assert.equal(name, 'MyToken');
    assert.equal(symbol, 'MTK');
  });

  it('Should preserve balances after upgrade', async function () {
    const initialSupply = parseEther('1000000');
    const [owner, user1, user2] = await viem.getWalletClients();

    // Deploy V1 and make some transactions
    const { proxy, token: tokenV1 } = await deployV1Token(initialSupply);

    // Transfer to users
    await tokenV1.write.transfer([user1.account.address, parseEther('100')]);
    await tokenV1.write.transfer([user2.account.address, parseEther('200')]);

    // Mint additional tokens
    await tokenV1.write.mint([user1.account.address, parseEther('50')]);

    // Record balances before upgrade
    const ownerBalanceBefore = await tokenV1.read.balanceOf([
      owner.account.address,
    ]);
    const user1BalanceBefore = await tokenV1.read.balanceOf([
      user1.account.address,
    ]);
    const user2BalanceBefore = await tokenV1.read.balanceOf([
      user2.account.address,
    ]);
    const totalSupplyBefore = await tokenV1.read.totalSupply();

    // Upgrade to V2
    const implementationV2 = await viem.deployContract('MyTokenV2');
    await tokenV1.write.upgradeToAndCall([implementationV2.address, '0x']);

    const tokenV2 = await viem.getContractAt('MyTokenV2', proxy.address);

    // Verify all balances are preserved
    const ownerBalanceAfter = await tokenV2.read.balanceOf([
      owner.account.address,
    ]);
    const user1BalanceAfter = await tokenV2.read.balanceOf([
      user1.account.address,
    ]);
    const user2BalanceAfter = await tokenV2.read.balanceOf([
      user2.account.address,
    ]);
    const totalSupplyAfter = await tokenV2.read.totalSupply();

    assert.equal(ownerBalanceAfter, ownerBalanceBefore);
    assert.equal(user1BalanceAfter, user1BalanceBefore);
    assert.equal(user2BalanceAfter, user2BalanceBefore);
    assert.equal(totalSupplyAfter, totalSupplyBefore);
  });

  it('Should maintain all V1 functionality in V2', async function () {
    const initialSupply = parseEther('1000000');
    const [owner, recipient] = await viem.getWalletClients();

    // Deploy V1 and upgrade to V2
    const { proxy, token: tokenV1 } = await deployV1Token(initialSupply);
    const implementationV2 = await viem.deployContract('MyTokenV2');
    await tokenV1.write.upgradeToAndCall([implementationV2.address, '0x']);

    const tokenV2 = await viem.getContractAt('MyTokenV2', proxy.address);

    // Test transfer
    await tokenV2.write.transfer([
      recipient.account.address,
      parseEther('100'),
    ]);
    const recipientBalance = await tokenV2.read.balanceOf([
      recipient.account.address,
    ]);
    assert.equal(recipientBalance, parseEther('100'));

    // Test mint
    await tokenV2.write.mint([recipient.account.address, parseEther('50')]);
    const recipientBalanceAfterMint = await tokenV2.read.balanceOf([
      recipient.account.address,
    ]);
    assert.equal(recipientBalanceAfterMint, parseEther('150'));

    // Test burn
    await tokenV2.write.burn([parseEther('10')]);
    const ownerBalance = await tokenV2.read.balanceOf([owner.account.address]);
    assert.equal(ownerBalance, initialSupply - parseEther('110')); // 100 transferred + 10 burned
  });
});
