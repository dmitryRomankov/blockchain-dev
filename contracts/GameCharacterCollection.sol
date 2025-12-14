// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GameCharacterCollection
 * @dev ERC-1155 multi-token contract for a game character collection
 * @notice This contract manages 10 distinct game characters, each with unique attributes
 *
 * Features:
 * - 10 unique character token IDs (0-9)
 * - Each character has unique attributes (color, speed, strength, rarity)
 * - Supports batch minting and batch transfers
 * - Metadata stored on IPFS
 * - Owner-controlled minting
 * - Full ERC-1155 standard compliance
 */
contract GameCharacterCollection is ERC1155, Ownable {
    using Strings for uint256;

    // Custom errors for gas efficiency
    error InvalidTokenId();
    error InvalidQuantity();
    error InsufficientBalance();
    error InvalidArrayLength();
    error CharacterNotInitialized();

    /// @dev Character attributes structure
    struct CharacterAttributes {
        string name;
        string color;
        uint8 speed; // 1-100
        uint8 strength; // 1-100
        string rarity; // Common, Rare, Epic, Legendary
        bool initialized;
    }

    /// @dev Maximum token ID (0-9 = 10 characters)
    uint256 public constant MAX_TOKEN_ID = 9;

    /// @dev Total number of character types
    uint256 public constant TOTAL_CHARACTERS = 10;

    /// @dev Base URI for token metadata
    string private _baseTokenURI;

    /// @dev Mapping from token ID to character attributes
    mapping(uint256 => CharacterAttributes) private _characterAttributes;

    /// @dev Mapping to track total supply of each token ID
    mapping(uint256 => uint256) private _totalSupply;

    // Events
    event CharacterInitialized(
        uint256 indexed tokenId,
        string name,
        string color,
        uint8 speed,
        uint8 strength,
        string rarity
    );
    event BatchMinted(
        address indexed to,
        uint256[] tokenIds,
        uint256[] amounts
    );
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Constructor initializes the ERC-1155 contract
     * @param baseURI The base URI for token metadata (e.g., ipfs://QmHash/)
     */
    constructor(string memory baseURI) ERC1155(baseURI) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Initializes a character with its attributes
     * @param tokenId The token ID (0-9)
     * @param name Character name
     * @param color Character color
     * @param speed Speed attribute (1-100)
     * @param strength Strength attribute (1-100)
     * @param rarity Rarity tier
     *
     * Requirements:
     * - Only callable by contract owner
     * - Token ID must be 0-9
     */
    function initializeCharacter(
        uint256 tokenId,
        string memory name,
        string memory color,
        uint8 speed,
        uint8 strength,
        string memory rarity
    ) external onlyOwner {
        if (tokenId > MAX_TOKEN_ID) revert InvalidTokenId();
        if (speed == 0 || speed > 100) revert InvalidQuantity();
        if (strength == 0 || strength > 100) revert InvalidQuantity();

        _characterAttributes[tokenId] = CharacterAttributes({
            name: name,
            color: color,
            speed: speed,
            strength: strength,
            rarity: rarity,
            initialized: true
        });

        emit CharacterInitialized(
            tokenId,
            name,
            color,
            speed,
            strength,
            rarity
        );
    }

    /**
     * @dev Mints a single character NFT
     * @param to Recipient address
     * @param tokenId Token ID to mint (0-9)
     * @param amount Quantity to mint
     * @param data Additional data for transfer hook
     *
     * Requirements:
     * - Only callable by contract owner
     * - Character must be initialized
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        if (tokenId > MAX_TOKEN_ID) revert InvalidTokenId();
        if (amount == 0) revert InvalidQuantity();
        if (!_characterAttributes[tokenId].initialized)
            revert CharacterNotInitialized();

        _mint(to, tokenId, amount, data);
        _totalSupply[tokenId] += amount;
    }

    /**
     * @dev Batch mints multiple character NFTs
     * @param to Recipient address
     * @param tokenIds Array of token IDs to mint
     * @param amounts Array of quantities to mint
     * @param data Additional data for transfer hook
     *
     * Requirements:
     * - Only callable by contract owner
     * - Arrays must have same length
     * - All characters must be initialized
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        if (tokenIds.length != amounts.length) revert InvalidArrayLength();
        if (tokenIds.length == 0) revert InvalidQuantity();

        // Validate all token IDs and characters
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] > MAX_TOKEN_ID) revert InvalidTokenId();
            if (amounts[i] == 0) revert InvalidQuantity();
            if (!_characterAttributes[tokenIds[i]].initialized) {
                revert CharacterNotInitialized();
            }
            _totalSupply[tokenIds[i]] += amounts[i];
        }

        _mintBatch(to, tokenIds, amounts, data);
        emit BatchMinted(to, tokenIds, amounts);
    }

    /**
     * @dev Burns a specific amount of tokens
     * @param account Address to burn from
     * @param tokenId Token ID to burn
     * @param amount Quantity to burn
     */
    function burn(address account, uint256 tokenId, uint256 amount) external {
        if (account != msg.sender && !isApprovedForAll(account, msg.sender)) {
            revert InsufficientBalance();
        }

        _burn(account, tokenId, amount);
        _totalSupply[tokenId] -= amount;
    }

    /**
     * @dev Burns multiple tokens in batch
     * @param account Address to burn from
     * @param tokenIds Array of token IDs to burn
     * @param amounts Array of quantities to burn
     */
    function burnBatch(
        address account,
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external {
        if (account != msg.sender && !isApprovedForAll(account, msg.sender)) {
            revert InsufficientBalance();
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _totalSupply[tokenIds[i]] -= amounts[i];
        }

        _burnBatch(account, tokenIds, amounts);
    }

    /**
     * @dev Returns the URI for a specific token ID
     * @param tokenId Token ID to get URI for
     * @return The complete URI pointing to the token's metadata
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        if (tokenId > MAX_TOKEN_ID) revert InvalidTokenId();
        if (!_characterAttributes[tokenId].initialized)
            revert CharacterNotInitialized();

        return
            string(
                abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json")
            );
    }

    /**
     * @dev Returns character attributes for a given token ID
     * @param tokenId Token ID to query
     * @return name Character name
     * @return color Character color
     * @return speed Speed attribute
     * @return strength Strength attribute
     * @return rarity Rarity tier
     */
    function getCharacterAttributes(
        uint256 tokenId
    )
        external
        view
        returns (
            string memory name,
            string memory color,
            uint8 speed,
            uint8 strength,
            string memory rarity
        )
    {
        if (tokenId > MAX_TOKEN_ID) revert InvalidTokenId();
        CharacterAttributes memory attrs = _characterAttributes[tokenId];
        if (!attrs.initialized) revert CharacterNotInitialized();

        return (
            attrs.name,
            attrs.color,
            attrs.speed,
            attrs.strength,
            attrs.rarity
        );
    }

    /**
     * @dev Returns the total supply of a specific token ID
     * @param tokenId Token ID to query
     * @return Total minted supply
     */
    function totalSupply(uint256 tokenId) external view returns (uint256) {
        if (tokenId > MAX_TOKEN_ID) revert InvalidTokenId();
        return _totalSupply[tokenId];
    }

    /**
     * @dev Checks if a character has been initialized
     * @param tokenId Token ID to check
     * @return True if initialized, false otherwise
     */
    function isCharacterInitialized(
        uint256 tokenId
    ) external view returns (bool) {
        if (tokenId > MAX_TOKEN_ID) revert InvalidTokenId();
        return _characterAttributes[tokenId].initialized;
    }

    /**
     * @dev Updates the base URI for all tokens
     * @param newBaseURI New base URI
     *
     * Requirements:
     * - Only callable by contract owner
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        _setURI(newBaseURI);
        emit BaseURIUpdated(newBaseURI);
    }

    /**
     * @dev Returns the base URI
     * @return The base URI string
     */
    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Returns an array of all token IDs that an account owns (with quantities)
     * @param account Address to query
     * @return tokenIds Array of owned token IDs
     * @return balances Array of balances for each token ID
     */
    function getOwnedTokens(
        address account
    )
        external
        view
        returns (uint256[] memory tokenIds, uint256[] memory balances)
    {
        uint256 count = 0;

        // First pass: count owned tokens
        for (uint256 i = 0; i <= MAX_TOKEN_ID; i++) {
            if (balanceOf(account, i) > 0) {
                count++;
            }
        }

        // Allocate arrays
        tokenIds = new uint256[](count);
        balances = new uint256[](count);

        // Second pass: populate arrays
        uint256 index = 0;
        for (uint256 i = 0; i <= MAX_TOKEN_ID; i++) {
            uint256 balance = balanceOf(account, i);
            if (balance > 0) {
                tokenIds[index] = i;
                balances[index] = balance;
                index++;
            }
        }

        return (tokenIds, balances);
    }
}
