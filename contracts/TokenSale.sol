// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenSale is Ownable {
    IERC20 public token;
    uint256 public rate = 1000; // 1 ETH = 1000 MTK

    constructor(address tokenAddress) Ownable(msg.sender) {
        token = IERC20(tokenAddress);
    }

    function buyToken() public payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 tokenAmount = msg.value * rate;
        require(token.balanceOf(owner()) >= tokenAmount, "Not enough tokens in reserve");

        token.transferFrom(owner(), msg.sender, tokenAmount);
    }

    function setRate(uint256 newRate) external onlyOwner {
        rate = newRate;
    }

    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
