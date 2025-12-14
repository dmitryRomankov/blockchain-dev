import { formatEther } from 'viem';
import { network } from 'hardhat';

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer, owner2] = await viem.getWalletClients();

  console.log(
    'Deploying MultiSigWallet with account:',
    deployer.account.address
  );
  console.log('Second owner will be:', owner2.account.address);

  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log('Deployer balance:', formatEther(balance), 'ETH\n');

  // Deploy MultiSigWallet with two owners
  console.log('Deploying MultiSigWallet...');
  const wallet = await viem.deployContract('MultiSigWallet', [
    [deployer.account.address, owner2.account.address],
  ]);

  console.log('✅ MultiSigWallet deployed to:', wallet.address);
  console.log('\nWallet Configuration:');
  console.log('  Owner 1:', deployer.account.address);
  console.log('  Owner 2:', owner2.account.address);

  const numConfirmations = await wallet.read.numConfirmationsRequired();
  console.log('  Required Confirmations:', String(numConfirmations));

  console.log('\n🔍 Contract Verification:');
  console.log(
    `View on Polygonscan: https://amoy.polygonscan.com/address/${wallet.address}`
  );

  // Save deployment info
  const deploymentInfo = {
    walletAddress: wallet.address,
    owner1: deployer.account.address,
    owner2: owner2.account.address,
    requiredConfirmations: String(numConfirmations),
    deployedAt: new Date().toISOString(),
  };

  console.log('\n💾 Deployment Info (save this):');
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
