import { parseEther, formatEther, encodeFunctionData } from 'viem';
import { network } from 'hardhat';

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  console.log('Deploying MyToken with account:', deployer.account.address);

  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log('Account balance:', formatEther(balance), 'MATIC');

  // Deploy with 1 million initial supply
  const initialSupply = parseEther('1000000');
  console.log('Initial supply:', formatEther(initialSupply), 'MTK');

  // Deploy implementation
  const implementation = await viem.deployContract('MyToken');
  console.log('Implementation deployed to:', implementation.address);

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

  const myToken = await viem.getContractAt('MyToken', proxy.address);

  console.log('MyToken Proxy deployed to:', proxy.address);
  console.log('Implementation at:', implementation.address);
  console.log('Token Name: MyToken');
  console.log('Token Symbol: MTK');
  console.log('Owner:', deployer.account.address);
  console.log(
    `View Proxy on Polygonscan: https://amoy.polygonscan.com/address/${proxy.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
