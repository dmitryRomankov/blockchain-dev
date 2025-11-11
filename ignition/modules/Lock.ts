import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

const LockModule = buildModule('LockModule', (m) => {
  const unlockTime = m.getParameter(
    'unlockTime',
    Math.floor(Date.now() / 1000) + ONE_YEAR_IN_SECS
  );
  const lockedAmount = m.getParameter('lockedAmount', 0n);

  const lock = m.contract('Lock', [unlockTime], {
    value: lockedAmount,
  });

  return { lock };
});

export default LockModule;
