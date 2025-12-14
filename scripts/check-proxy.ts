import { getAddress } from 'viem';
import { network } from 'hardhat';

async function main() {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  const PROXY_ADDRESS = process.env.PROXY_ADDRESS;

  if (!PROXY_ADDRESS) {
    throw new Error('Please set PROXY_ADDRESS environment variable');
  }

  console.log('Checking Proxy at:', PROXY_ADDRESS);

  // Check if there's code at the proxy address
  const code = await publicClient.getBytecode({
    address: getAddress(PROXY_ADDRESS),
  });

  if (!code || code === '0x') {
    console.log('❌ No contract deployed at this address!');
    console.log('You need to deploy the proxy first using:');
    console.log('npx hardhat run scripts/deploy.ts --network localhost');
    return;
  }

  console.log('✅ Contract exists at proxy address');
  console.log('Bytecode length:', code.length, 'characters');

  // Try to read the implementation address from the ERC1967 storage slot
  const IMPLEMENTATION_SLOT =
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

  const implementationSlot = await publicClient.getStorageAt({
    address: getAddress(PROXY_ADDRESS),
    slot: IMPLEMENTATION_SLOT,
  });

  if (!implementationSlot || implementationSlot === '0x' + '0'.repeat(64)) {
    console.log('❌ No implementation address set in proxy!');
    console.log('The proxy exists but is not initialized.');
  } else {
    // Extract address from storage slot (last 20 bytes)
    const implementationAddress = '0x' + implementationSlot.slice(-40);
    console.log('✅ Implementation address:', implementationAddress);

    // Check if implementation has code
    const implCode = await publicClient.getBytecode({
      address: getAddress(implementationAddress),
    });

    if (!implCode || implCode === '0x') {
      console.log('❌ No code at implementation address!');
    } else {
      console.log('✅ Implementation contract exists');
      console.log(
        'Implementation bytecode length:',
        implCode.length,
        'characters'
      );
    }
  }

  // Try to call the proxy as MyToken
  console.log('\nTrying to call functions through proxy:');
  try {
    const token = await viem.getContractAt(
      'MyToken',
      getAddress(PROXY_ADDRESS)
    );
    const owner = await token.read.owner();
    console.log('✅ owner():', owner);

    const name = await token.read.name();
    console.log('✅ name():', name);

    const symbol = await token.read.symbol();
    console.log('✅ symbol():', symbol);

    const totalSupply = await token.read.totalSupply();
    console.log('✅ totalSupply():', totalSupply.toString());
  } catch (error: any) {
    console.log(
      '❌ Error calling functions:',
      error.shortMessage || error.message
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
