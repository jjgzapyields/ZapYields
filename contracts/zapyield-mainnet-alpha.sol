// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IMToken {
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function exchangeRateStored() external view returns (uint);
}

contract ZapYieldsMainnet is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // OFFICIAL BASE MAINNET ADDRESSES
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); 
    IMToken public constant mUSDC = IMToken(0x1686616428c04907aB37a8987b7a97260714E290); 

    uint256 public constant MIN_INVESTMENT = 10 * 1e6; // $10 USDC

    struct UserInfo {
        uint256 principal;
        uint256 shareBalance;
        address referrer;
    }

    mapping(address => UserInfo) public users;
    mapping(address => address[]) public referralList;

    constructor() Ownable(msg.sender) {}

    function zapIn(uint256 _amount, address _referrer) external nonReentrant {
        require(_amount >= MIN_INVESTMENT, "Min 10 USDC");
        require(_referrer != msg.sender, "No self-referral");

        if (users[msg.sender].referrer == address(0) && _referrer != address(0)) {
            users[msg.sender].referrer = _referrer;
            referralList[_referrer].push(msg.sender);
        }

        USDC.safeTransferFrom(msg.sender, address(this), _amount);
        USDC.approve(address(mUSDC), _amount);
        
        uint256 preBal = mUSDC.balanceOf(address(this));
        require(mUSDC.mint(_amount) == 0, "Morpho Mint failed");
        uint256 newShares = mUSDC.balanceOf(address(this)) - preBal;

        users[msg.sender].principal += _amount;
        users[msg.sender].shareBalance += newShares;
    }

    function zapOut() external nonReentrant {
        UserInfo storage user = users[msg.sender];
        require(user.shareBalance > 0, "No balance");

        uint256 amountToRedeem = user.shareBalance;
        user.shareBalance = 0;
        user.principal = 0;

        require(mUSDC.redeem(amountToRedeem) == 0, "Morpho Redeem failed");
        uint256 balance = USDC.balanceOf(address(this));
        USDC.safeTransfer(msg.sender, balance);
    }

    function getAccountValue(address _user) external view returns (uint256) {
        uint256 rate = mUSDC.exchangeRateStored();
        return (users[_user].shareBalance * rate) / 1e18;
    }

    function getDownlines(address _user) external view returns (address[] memory) {
        return referralList[_user];
    }
}