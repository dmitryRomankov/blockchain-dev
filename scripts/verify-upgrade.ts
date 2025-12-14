import { getAddress } from 'viem';
import { network } from 'hardhat';

async function main() {
  const { viem } = await network.connect();

  const PROXY_ADDRESS = '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707';

  console.log('Calling version() on proxy...');
  console.log('Proxy Address:', PROXY_ADDRESS);

  try {
    // Get contract instance as V2 at proxy address
    const tokenV2 = await viem.getContractAt(
      'MyTokenV2',
      getAddress(PROXY_ADDRESS)
    );

    // Call the version() function
    const version = await tokenV2.read.version();

    console.log('Success!');
    console.log('Version function output:', version);
    console.log('The proxy has been successfully upgraded to V2!');

    // Additional verification
    const name = await tokenV2.read.name();
    const symbol = await tokenV2.read.symbol();
    console.log('Token Details:');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
  } catch (error: any) {
    console.log('Failed to call version()');
    if (error.message.includes('version')) {
      console.log('The contract is likely still on V1 (no version function)');
      console.log('Run the upgrade script first:');
      console.log(
        'PROXY_ADDRESS=0x... npx hardhat run scripts/upgrade-to-v2.ts --network polygonAmoy'
      );
    } else {
      console.error('Error:', error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
