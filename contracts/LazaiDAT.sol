// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LazaiDAT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    // Struct to hold metadata for each DAT
    struct DatMetadata {
        string name;
        string description;
        uint256 price; // Price in wei
    }

    // Mapping from token ID to its metadata
    mapping(uint256 => DatMetadata) public datMetadata;

    // Event to signal when a new DAT is minted
    event DATMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string name,
        uint256 price
    );

    constructor(address initialOwner)
        ERC721("LazaiDAT", "LDAT")
        Ownable(initialOwner)
    {}

    // Function to mint a new DAT
    function safeMint(address to, string memory uri, string memory name, string memory description, uint256 price)
        public
        onlyOwner
    {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        // Store the metadata
        datMetadata[tokenId] = DatMetadata(name, description, price);

        // Emit an event
        emit DATMinted(tokenId, to, name, price);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    function purchase(uint256 tokenId) public payable {
        uint256 price = datMetadata[tokenId].price;
        address owner = ownerOf(tokenId);

        require(msg.value == price, "Please submit the asking price in order to complete the purchase");

        // Transfer the token from the owner to the buyer
        _transfer(owner, msg.sender, tokenId);

        // Transfer the payment to the seller
        (bool success, ) = payable(owner).call{value: msg.value}("");
        require(success, "Payment failed");
    }

    // The following functions are overrides required by Solidity.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}