import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

/**
 * This module upgrades an existing MyToken proxy to V2
 * Usage: npx hardhat ignition deploy ignition/modules/UpgradeToV2.ts --network polygonAmoy --parameters '{"UpgradeToV2Module":{"proxyAddress":"0x..."}}'
 */
const UpgradeToV2Module = buildModule('UpgradeToV2Module', (m) => {
  // Get the existing proxy address from parameters
  const proxyAddress = m.getParameter('proxyAddress');

  // Deploy new V2 implementation
  const implementationV2 = m.contract('MyTokenV2');

  // Get existing contract at proxy address
  const proxyAsV1 = m.contractAt('MyToken', proxyAddress);

  // Perform the upgrade
  m.call(proxyAsV1, 'upgradeToAndCall', [implementationV2, '0x']);

  return {
    newImplementation: implementationV2,
    proxy: proxyAsV1,
  };
});

export default UpgradeToV2Module;
