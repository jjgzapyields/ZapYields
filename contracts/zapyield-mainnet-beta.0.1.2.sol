// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IMorphoVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function convertToAssets(uint256 shares) external view returns (uint256);
}

contract ZapYieldsV2Pro is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); 
    IMorphoVault public constant mUSDC = IMorphoVault(0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca); 

    // Profit Distribution Rules
    uint256 public constant REFERRAL_SHARE = 10; // 10%
    uint256 public constant PROTOCOL_FEE = 5;    // 5%

    struct UserInfo {
        uint256 principal;
        uint256 shareBalance;
        address referrer;
        uint256 totalReferralEarnings;
    }

    mapping(address => UserInfo) public users;
    uint256 public totalProtocolFees;

    constructor() Ownable(msg.sender) {}

    function zapIn(uint256 _amount, address _referrer) external nonReentrant {
        require(_amount >= 10 * 1e6, "Min 10 USDC");
        require(_referrer != msg.sender, "No self-referral");

        UserInfo storage user = users[msg.sender];

        // Link Referrer Permanently
        if (user.referrer == address(0) && _referrer != address(0)) {
            user.referrer = _referrer;
        }

        // Deposit to Morpho
        USDC.safeTransferFrom(msg.sender, address(this), _amount);
        USDC.approve(address(mUSDC), _amount);
        uint256 newShares = mUSDC.deposit(_amount, address(this));
        
        user.principal += _amount;
        user.shareBalance += newShares;
    }

    function zapOut() external nonReentrant {
        UserInfo storage user = users[msg.sender];
        require(user.shareBalance > 0, "No balance");

        uint256 shares = user.shareBalance;
        uint256 principal = user.principal;

        user.shareBalance = 0;
        user.principal = 0;

        // Redeem All
        mUSDC.redeem(shares, address(this), address(this));
        uint256 totalValue = mUSDC.convertToAssets(shares);

        // Profit Calculation
        uint256 profit = 0;
        if (totalValue > principal) {
            profit = totalValue - principal;
        }

        // Distribution Logic
        if (profit > 0) {
            uint256 refPayout = (profit * REFERRAL_SHARE) / 100;
            uint256 ownerFee = (profit * PROTOCOL_FEE) / 100;
            uint256 userProfit = profit - refPayout - ownerFee;

            // Pay Referrer Instantly
            if (user.referrer != address(0)) {
                USDC.safeTransfer(user.referrer, refPayout);
                users[user.referrer].totalReferralEarnings += refPayout;
            } else {
                totalProtocolFees += refPayout; // No referrer? Goes to protocol
            }

            totalProtocolFees += ownerFee;
            USDC.safeTransfer(msg.sender, principal + userProfit);
        } else {
            USDC.safeTransfer(msg.sender, principal);
        }
    }

    function getAccountValue(address _user) external view returns (uint256) {
        return mUSDC.convertToAssets(users[_user].shareBalance);
    }

    // New Function for Website Display
    function getReferralEarnings(address _user) external view returns (uint256) {
        return users[_user].totalReferralEarnings;
    }

    function collectFees() external onlyOwner {
        uint256 amount = totalProtocolFees;
        totalProtocolFees = 0;
        USDC.safeTransfer(owner(), amount);
    }
}