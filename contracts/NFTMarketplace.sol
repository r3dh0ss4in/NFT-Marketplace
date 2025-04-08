// File: contracts/NFTMarketplace.sol

//     Pragma statements

//     Import statements

//     Events

//     Errors

//     Interfaces

//     Libraries

//     Contracts

// Inside each contract, library or interface, use the following order:

//     Type declarations

//     State variables

//     Events

//     Errors

//     Modifiers

//     Functions

//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {console} from "hardhat/console.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Farena[NFT Marketplace]
 * @author Reduan Hossain
 */

contract Farena is ERC721URIStorage {
    using Counters for Counters.Counter;

    // Types

    struct ListedToken {
        uint256 tokenId;
        address payable owner;
        address payable seller;
        uint256 price;
        bool currentlyListed;
    }

    // State variables

    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;
    address payable owner;
    uint256 listPrice = 0.0001 ether;
    mapping(uint256 => ListedToken) private idToListedToken;

    // Events 

    event TokenListedSuccess(
        uint256 indexed tokenId,
        address owner,
        address seller,
        uint256 price,
        bool currentlyListed
    );

    event TokenSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed newOwner,
        uint256 price
    );

    // Functions

    constructor() ERC721("Farena", "FAR") {
        owner = payable(msg.sender);
    }

    function updateListPrice(uint256 _listPrice) public payable {
        require(msg.sender == owner, "Only owner can update listing price");
        listPrice = _listPrice;
    }

    function getLatestIdToListedToken() public view returns (ListedToken memory) {
        uint256 currentTokenId = _tokenIds.current();
        return idToListedToken[currentTokenId];
    }

    function getCurrentToken() public view returns (uint256) {
        return _tokenIds.current();
    }

    function createToken(string memory tokenURI, uint256 price) public payable returns (uint) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        createListedToken(newTokenId, price);
        return newTokenId;
    }

    function getAllNFTs() public view returns (ListedToken[] memory) {
        uint nftCount = _tokenIds.current();
        ListedToken[] memory tokens = new ListedToken[](nftCount);
        uint currentIndex = 0;
        uint currentId;

        for (uint i = 0; i < nftCount; i++) {
            currentId = i + 1;
            ListedToken storage currentItem = idToListedToken[currentId];
            tokens[currentIndex] = currentItem;
            currentIndex += 1;
        }
        return tokens;
    }

    function getMyNFTs() public view returns (ListedToken[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        uint currentId;

        // First pass to count owned NFTs
        for (uint i = 0; i < totalItemCount; i++) {
            if (idToListedToken[i+1].owner == msg.sender) {
                itemCount += 1;
            }
        }
        
        // Second pass to collect owned NFTs
        ListedToken[] memory items = new ListedToken[](itemCount);
        for (uint i = 0; i < totalItemCount; i++) {
            if(idToListedToken[i+1].owner == msg.sender) {
                currentId = i+1;
                ListedToken storage currentItem = idToListedToken[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function executeSale(uint256 tokenId) public payable {
        ListedToken storage listedToken = idToListedToken[tokenId];
        
        require(listedToken.currentlyListed, "Token not listed");
        require(msg.value == listedToken.price, "Incorrect payment");
        require(msg.sender != listedToken.seller, "Seller cannot buy");

        // Store previous owner for event
        address previousOwner = listedToken.owner;
        
        // Update state before transfer
        listedToken.owner = payable(msg.sender);
        listedToken.currentlyListed = false;
        listedToken.seller = payable(msg.sender); // New owner becomes potential seller
        _itemsSold.increment();
        
        // Transfer NFT
        _transfer(address(this), msg.sender, tokenId);
        
        // Transfer funds
        payable(owner).transfer(listPrice);
        payable(previousOwner).transfer(msg.value);
        
        emit TokenSold(tokenId, previousOwner, msg.sender, msg.value);
        emit Transfer(previousOwner, msg.sender, tokenId);
    }

    function createListedToken(uint256 tokenId, uint256 price) public payable {
        require(msg.value == listPrice, "Must pay listing fee");
        require(price > 0, "Price must be positive");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(!idToListedToken[tokenId].currentlyListed, "Already listed");

        // Update listing info
        idToListedToken[tokenId] = ListedToken(
            tokenId,
            payable(msg.sender), // owner
            payable(msg.sender), // seller
            price,
            true
        );

        // Transfer token to marketplace escrow
        _transfer(msg.sender, address(this), tokenId);
        
        emit TokenListedSuccess(tokenId, msg.sender, msg.sender, price, true);
    }

    function getListPrice() public view returns (uint256) {
        return listPrice;
    }

    function getListedTokenForId(uint256 tokenId) public view returns (ListedToken memory) {
        return idToListedToken[tokenId];
    }
}
