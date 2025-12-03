import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { parseEther } from 'viem';

const MyTokenModule = buildModule('MyTokenModule', (m) => {
  // Default: 1 million tokens
  const initialSupply = m.getParameter('initialSupply', parseEther('1000000'));

  const myToken = m.contract('MyToken', [initialSupply]);

  return { myToken };
});

export default MyTokenModule;
