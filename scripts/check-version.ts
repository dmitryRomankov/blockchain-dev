import { formatEther, getAddress } from 'viem';
import { network } from 'hardhat';

async function main() {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    throw new Error('Please set PROXY_ADDRESS environment variable');
  }

  console.log('Checking MyToken Version...');
  console.log('Proxy Address:', PROXY_ADDRESS);

  // Try to get V2 contract (has version function)
  try {
    const tokenV2 = await viem.getContractAt(
      'MyTokenV2',
      getAddress(PROXY_ADDRESS)
    );
    const version = await tokenV2.read.version();

    console.log('Current Version:', version);

    // Show token details
    const name = await tokenV2.read.name();
    const symbol = await tokenV2.read.symbol();
    const totalSupply = (await tokenV2.read.totalSupply()) as bigint;
    const ownerBalance = (await tokenV2.read.balanceOf([
      owner.account.address,
    ])) as bigint;

    console.log('Token Details:');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('Total Supply:', formatEther(totalSupply), symbol);
    console.log('Your Balance:', formatEther(ownerBalance), symbol);
  } catch (error) {
    console.log('Current Version: V1 (version() function not available)');
    console.log('Run upgrade script to upgrade to V2');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
