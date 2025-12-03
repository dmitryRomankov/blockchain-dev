// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title MyTokenProxy
 * @dev This contract is the proxy for MyToken using the UUPS pattern.
 * It delegates all calls to the implementation contract (MyToken logic contract).
 *
 * The proxy stores:
 * - All state variables (balances, allowances, totalSupply, etc.)
 * - The address of the implementation contract
 *
 * The implementation contract (MyToken) contains:
 * - All the logic (functions)
 * - No state (state lives in the proxy)
 */
contract MyTokenProxy is ERC1967Proxy {
    /**
     * @dev Initializes the proxy with the implementation address and initialization data
     * @param _implementation Address of the MyToken implementation contract
     * @param _data Encoded call to initialize() function with parameters
     */
    constructor(
        address _implementation,
        bytes memory _data
    ) ERC1967Proxy(_implementation, _data) {}
}
