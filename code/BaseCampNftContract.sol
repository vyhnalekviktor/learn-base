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

    // Sleduje, kolik NFT už daná adresa má (aby nemohl mintovat 2x)
    mapping(address => uint256) public mintedPerWallet;

    constructor(address usdcAddress)
        ERC721("BaseCamp Completion Badge", "BASECAMP")
        Ownable(msg.sender)
    {
        usdc = IERC20(usdcAddress);
        baseTokenURI = "ipfs://bafkreibstsppqb6c7hjohu54hr5v6zmf6aqoqcu253zpormxtf26iljujy/0";
    }

    // --- NOVÁ FUNKCE PRO BACKEND MINT ---
    // Tuto funkci volá tvůj backend poté, co ověří, že ti přišly USDC.
    // Uživatel neplatí gas ani nedělá approve.
    function airdrop(address to) external onlyOwner {
        require(nextTokenId <= MAX_SUPPLY, "Max supply reached");
        require(mintedPerWallet[to] < 1, "Wallet already received NFT");

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        mintedPerWallet[to] += 1;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, baseTokenURI);
    }

    // --- PŮVODNÍ FUNKCE (ZÁLOHA) ---
    function mintWithUSDC() external {
        require(nextTokenId <= MAX_SUPPLY, "Max supply reached");
        require(mintedPerWallet[msg.sender] < 1, "Wallet already minted");

        // User musí mít approve na 2 USDC pro tento kontrakt
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

    // Funkce pro výběr USDC, pokud by někdo použil starou metodu
    function withdrawUSDC(address to) external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No USDC to withdraw");
        require(usdc.transfer(to, balance), "Withdraw failed");
    }
}