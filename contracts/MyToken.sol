pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyToken is
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
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract.
     * Called by {upgradeTo} and {upgradeToAndCall}.
     * Only the owner can upgrade the contract.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
