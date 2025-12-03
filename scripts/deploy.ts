import { parseEther, formatEther } from 'viem';
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

  const myToken = await viem.deployContract('MyToken', [initialSupply]);

  console.log('✅ MyToken deployed to:', myToken.address);
  console.log('Token Name: MyToken');
  console.log('Token Symbol: MTK');
  console.log('Owner:', deployer.account.address);
  console.log(
    `View on Polygonscan: https://amoy.polygonscan.com/address/${myToken.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
