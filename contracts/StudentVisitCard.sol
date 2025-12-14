// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title StudentVisitCard
 * @dev Soulbound ERC-721 token representing a student's visit card
 * @notice This token cannot be transferred after minting - it's permanently bound to the student's wallet
 *
 * Features:
 * - One unique token per student
 * - Contains student metadata (name, ID, course, year)
 * - Soulbound: Cannot be transferred or approved once minted
 * - Only contract owner can mint tokens
 * - Metadata stored on IPFS
 */
contract StudentVisitCard is ERC721, Ownable {
    using Strings for uint256;

    // Custom errors for gas efficiency
    error AlreadyHasVisitCard();
    error NoVisitCardMinted();
    error TransferNotAllowed();
    error ApprovalNotAllowed();
    error StudentNotFound();
    error InvalidStudentData();

    /// @dev Student metadata structure
    struct StudentData {
        string studentName;
        string studentID;
        string course;
        uint16 year;
        bool exists;
    }

    /// @dev Base URI for token metadata (IPFS gateway)
    string private _baseTokenURI;

    /// @dev Counter for token IDs
    uint256 private _nextTokenId;

    /// @dev Mapping from token ID to student data
    mapping(uint256 => StudentData) private _studentData;

    /// @dev Mapping from student wallet address to token ID
    mapping(address => uint256) private _studentToToken;

    /// @dev Mapping to track if a student address has been minted
    mapping(address => bool) private _hasMinted;

    // Events
    event VisitCardMinted(
        address indexed student,
        uint256 indexed tokenId,
        string studentName,
        string studentID,
        string course,
        uint16 year
    );
    event BaseURIUpdated(string newBaseURI);

    /**
     * @dev Constructor initializes the ERC-721 token and sets the base URI
     * @param baseURI The base URI for token metadata (e.g., ipfs://...)
     */
    constructor(
        string memory baseURI
    ) ERC721("Student Visit Card", "SVC") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
        _nextTokenId = 1; // Start token IDs from 1
    }

    /**
     * @dev Mints a soulbound visit card NFT to a student's wallet
     * @param student The wallet address of the student
     * @param studentName The full name of the student
     * @param studentID The unique student identification number
     * @param course The course or major the student is enrolled in
     * @param year The academic year of the student
     *
     * Requirements:
     * - Only callable by contract owner
     * - Student must not already have a visit card
     * - Student data must be valid (non-empty strings)
     */
    function mintVisitCard(
        address student,
        string memory studentName,
        string memory studentID,
        string memory course,
        uint16 year
    ) external onlyOwner {
        // Validate student address
        if (student == address(0)) revert InvalidStudentData();

        // Check if student already has a visit card
        if (_hasMinted[student]) revert AlreadyHasVisitCard();

        // Validate student data
        if (
            bytes(studentName).length == 0 ||
            bytes(studentID).length == 0 ||
            bytes(course).length == 0 ||
            year == 0
        ) revert InvalidStudentData();

        uint256 tokenId = _nextTokenId++;

        // Mint the token
        _safeMint(student, tokenId);

        // Store student data
        _studentData[tokenId] = StudentData({
            studentName: studentName,
            studentID: studentID,
            course: course,
            year: year,
            exists: true
        });

        // Mark student as having minted
        _hasMinted[student] = true;
        _studentToToken[student] = tokenId;

        emit VisitCardMinted(
            student,
            tokenId,
            studentName,
            studentID,
            course,
            year
        );
    }

    /**
     * @dev Returns the token URI for a given token ID
     * @param tokenId The ID of the token
     * @return The complete URI pointing to the token's metadata
     */
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory baseURI = _baseURI();
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json"))
                : "";
    }

    /**
     * @dev Returns the student data for a given token ID
     * @param tokenId The ID of the token
     * @return studentName The name of the student
     * @return studentID The student's ID
     * @return course The student's course
     * @return year The student's academic year
     */
    function getStudentData(
        uint256 tokenId
    )
        external
        view
        returns (
            string memory studentName,
            string memory studentID,
            string memory course,
            uint16 year
        )
    {
        StudentData memory data = _studentData[tokenId];
        if (!data.exists) revert StudentNotFound();

        return (data.studentName, data.studentID, data.course, data.year);
    }

    /**
     * @dev Returns the token ID owned by a student address
     * @param student The wallet address of the student
     * @return The token ID owned by the student
     */
    function getTokenByStudent(
        address student
    ) external view returns (uint256) {
        if (!_hasMinted[student]) revert NoVisitCardMinted();
        return _studentToToken[student];
    }

    /**
     * @dev Checks if a student address has already minted a visit card
     * @param student The wallet address to check
     * @return True if the student has a visit card, false otherwise
     */
    function hasVisitCard(address student) external view returns (bool) {
        return _hasMinted[student];
    }

    /**
     * @dev Returns the total number of visit cards minted
     * @return The total supply of tokens
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    /**
     * @dev Updates the base URI for token metadata
     * @param baseURI The new base URI
     *
     * Requirements:
     * - Only callable by contract owner
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    /**
     * @dev Returns the base URI for token metadata
     * @return The base URI string
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // ========== SOULBOUND ENFORCEMENT ==========

    /**
     * @dev Override to prevent all transfers except minting
     * @notice This makes the token soulbound - it cannot be transferred after minting
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Block all transfers (including burns)
        revert TransferNotAllowed();
    }

    /**
     * @dev Override to prevent approvals
     * @notice Approvals are disabled for soulbound tokens
     */
    function approve(address, uint256) public virtual override {
        revert ApprovalNotAllowed();
    }

    /**
     * @dev Override to prevent operator approvals
     * @notice Operator approvals are disabled for soulbound tokens
     */
    function setApprovalForAll(address, bool) public virtual override {
        revert ApprovalNotAllowed();
    }

    /**
     * @dev Override to always return address(0) for approved address
     */
    function getApproved(
        uint256 tokenId
    ) public view virtual override returns (address) {
        _requireOwned(tokenId);
        return address(0);
    }

    /**
     * @dev Override to always return false for operator approval
     */
    function isApprovedForAll(
        address,
        address
    ) public view virtual override returns (bool) {
        return false;
    }
}
