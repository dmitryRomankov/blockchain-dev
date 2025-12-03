import { formatEther, getAddress } from 'viem';
import { network } from 'hardhat';

async function main() {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  // Replace with your deployed proxy address
  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    throw new Error('Please set PROXY_ADDRESS environment variable');
  }

  console.log('Upgrading MyToken Proxy...');
  console.log('Proxy Address:', PROXY_ADDRESS);
  console.log('Owner Address:', owner.account.address);

  // Get V1 contract instance at proxy address
  const tokenV1 = await viem.getContractAt(
    'MyToken',
    getAddress(PROXY_ADDRESS)
  );

  // Check current state before upgrade
  console.log('Before Upgrade (V1):');
  const name = await tokenV1.read.name();
  const symbol = await tokenV1.read.symbol();
  const totalSupply = (await tokenV1.read.totalSupply()) as bigint;
  const ownerBalance = (await tokenV1.read.balanceOf([
    owner.account.address,
  ])) as bigint;

  console.log('Token Name:', name);
  console.log('Token Symbol:', symbol);
  console.log('Total Supply:', formatEther(totalSupply), symbol);
  console.log('Owner Balance:', formatEther(ownerBalance), symbol);

  // Deploy new V2 implementation
  console.log('Deploying V2 Implementation...');
  const implementationV2 = await viem.deployContract('MyTokenV2');
  console.log('V2 Implementation deployed at:', implementationV2.address);

  // Upgrade the proxy to point to V2
  console.log('Upgrading proxy to V2...');
  const upgradeTx = await tokenV1.write.upgradeToAndCall([
    implementationV2.address,
    '0x', // No initialization data needed
  ]);
  console.log('Upgrade transaction hash:', upgradeTx);

  // Get V2 contract instance at same proxy address
  const tokenV2 = await viem.getContractAt(
    'MyTokenV2',
    getAddress(PROXY_ADDRESS)
  );

  // Verify upgrade was successful
  console.log('After Upgrade (V2):');
  const version = await tokenV2.read.version();
  console.log('Version:', version);

  // Verify state was preserved
  const totalSupplyAfter = (await tokenV2.read.totalSupply()) as bigint;
  const ownerBalanceAfter = (await tokenV2.read.balanceOf([
    owner.account.address,
  ])) as bigint;

  console.log('Total Supply:', formatEther(totalSupplyAfter), symbol);
  console.log('Owner Balance:', formatEther(ownerBalanceAfter), symbol);

  // Verify state preservation
  if (totalSupply === totalSupplyAfter && ownerBalance === ownerBalanceAfter) {
    console.log('Upgrade successful! All state preserved.');
  } else {
    console.log('Warning: State may have changed!');
  }

  console.log('Contract Details:');
  console.log('Proxy Address:', PROXY_ADDRESS);
  console.log('V2 Implementation:', implementationV2.address);
  console.log(
    'View on Polygonscan:',
    `https://amoy.polygonscan.com/address/${PROXY_ADDRESS}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
