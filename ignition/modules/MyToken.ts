import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { parseEther, encodeFunctionData } from 'viem';

const MyTokenModule = buildModule('MyTokenModule', (m) => {
  // Default: 1 million tokens
  const initialSupply = m.getParameter('initialSupply', parseEther('1000000'));

  // Step 1: Deploy the implementation contract (logic)
  const myTokenImplementation = m.contract('MyToken', []);

  // Step 2: Deploy the proxy contract pointing to the implementation
  const myTokenProxy = m.contract('MyTokenProxy', [
    myTokenImplementation,
    m.encodeFunctionCall(myTokenImplementation, 'initialize', [initialSupply]),
  ]);

  return {
    implementation: myTokenImplementation,
    proxy: myTokenProxy,
  };
});

export default MyTokenModule;
