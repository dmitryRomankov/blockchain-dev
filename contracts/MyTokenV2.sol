// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title MyTokenV2
 * @dev Version 2 of MyToken with additional version() function
 * @notice Storage layout is identical to V1 - safe for upgrades
 *
 * Storage Layout (inherited from V1):
 * - Slot 0: Initializable._initialized, Initializable._initializing
 * - Slot 1-50: Gap from Initializable (unused)
 * - Slot 51-100: ERC20Upgradeable storage (balances, allowances, totalSupply, name, symbol)
 * - Slot 101-150: Gap from ERC20Upgradeable
 * - Slot 151-200: OwnableUpgradeable storage (_owner)
 * - Slot 201-250: Gap from OwnableUpgradeable
 * - Slot 251-300: UUPSUpgradeable storage
 * - Slot 301-350: Gap from UUPSUpgradeable
 */
contract MyTokenV2 is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract (replaces constructor for upgradeable contracts)
     * @param initialSupply Initial token supply to mint to the deployer
     * @notice This should NOT be called again after upgrade - contract is already initialized
     */
    function initialize(uint256 initialSupply) public initializer {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mints new tokens. Only callable by the contract owner.
     * @param to Address to receive the newly minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens from the caller's account.
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Returns the version of the contract.
     * @return Version string indicating this is V2
     * @notice NEW FUNCTION in V2 - does not affect storage
     */
    function version() public pure returns (string memory) {
        return "--V2--";
    }

    /**
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract.
     * Called by {upgradeTo} and {upgradeToAndCall}.
     * Only the owner can upgrade the contract.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
