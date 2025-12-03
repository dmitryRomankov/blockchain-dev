import '@nomicfoundation/hardhat-toolbox-viem';
import { describe, it } from 'node:test';
import { network } from 'hardhat';
import { parseEther, encodeFunctionData } from 'viem';
import assert from 'node:assert/strict';

describe('MyToken Proxy (UUPS)', async function () {
  const { viem } = await network.connect();

  it('Should deploy proxy with correct initial supply', async function () {
    const initialSupply = parseEther('1000000');
    const [deployer] = await viem.getWalletClients();

    // Deploy implementation
    const implementation = await viem.deployContract('MyToken');

    // Encode initialize call
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

    // Deploy proxy
    const proxy = await viem.deployContract('MyTokenProxy', [
      implementation.address,
      initializeData,
    ]);

    // Get contract instance at proxy address
    const myToken = await viem.getContractAt('MyToken', proxy.address);

    const balance = await myToken.read.balanceOf([deployer.account.address]);
    assert.equal(balance, initialSupply);
  });

  it('Should transfer tokens through proxy', async function () {
    const initialSupply = parseEther('1000000');
    const [deployer, recipient] = await viem.getWalletClients();

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
    const myToken = await viem.getContractAt('MyToken', proxy.address);

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

  it('Should mint tokens as owner through proxy', async function () {
    const initialSupply = parseEther('1000000');
    const [_, recipient] = await viem.getWalletClients();

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
    const myToken = await viem.getContractAt('MyToken', proxy.address);

    const mintAmount = parseEther('500000');
    await myToken.write.mint([recipient.account.address, mintAmount]);

    const recipientBalance = await myToken.read.balanceOf([
      recipient.account.address,
    ]);
    const totalSupply = await myToken.read.totalSupply();

    assert.equal(recipientBalance, mintAmount);
    assert.equal(totalSupply, initialSupply + mintAmount);
  });
});
