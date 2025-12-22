// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BaseCampBadge is ERC721URIStorage, Ownable {
    IERC20 public immutable usdc;

    uint256 public constant PRICE = 2_000_000; // 2 USDC, 6 decimals
    uint256 public constant MAX_SUPPLY = 260;

    uint256 public nextTokenId = 1;
    string public baseTokenURI;

    // sleduje, kolik NFT už daná adresa mintla
    mapping(address => uint256) public mintedPerWallet;

    constructor(address usdcAddress)
        ERC721("BaseCamp Completion Badge", "BASECAMP")
        Ownable(msg.sender)
    {
        usdc = IERC20(usdcAddress);
        baseTokenURI = "ipfs://bafkreibstsppqb6c7hjohu54hr5v6zmf6aqoqcu253zpormxtf26iljujy/0";
    }

    function mintWithUSDC() external {
        require(nextTokenId <= MAX_SUPPLY, "Max supply reached");
        require(mintedPerWallet[msg.sender] < 1, "Wallet already minted");

        // user musi mit approve na 2 USDC pro tento kontrakt
        require(
            usdc.transferFrom(msg.sender, address(this), PRICE),
            "USDC transfer failed"
        );

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        mintedPerWallet[msg.sender] += 1;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, baseTokenURI);
    }

    function withdrawUSDC(address to) external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No USDC");
        require(usdc.transfer(to, balance), "Withdraw failed");
    }
}

