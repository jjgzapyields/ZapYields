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

contract ZapApyV2Pro is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); 
    IMorphoVault public constant mUSDC = IMorphoVault(0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca); 

    uint256 public constant PROTOCOL_FEE = 5;    // 5% of PROFIT
    uint256 public constant LOCK_TIME = 76 hours;
    uint256 public constant EARLY_EXIT_PENALTY = 1; // 1% of Total Value

    struct UserInfo {
        uint256 principal;
        uint256 shareBalance;
        address referrer;
        uint256 totalReferralEarnings;
        uint256 lastDepositTime;
    }

    mapping(address => UserInfo) public users;
    uint256 public totalProtocolFees;

    // Event for the Frontend to count "Total Recruits"
    event ZapIn(address indexed user, uint256 amount, address indexed referrer);

    constructor() Ownable(msg.sender) {}

    // ⚡ Logic for the 5 Power Tiers
    function getReferralRate(uint256 _principal) public pure returns (uint256) {
        if (_principal >= 5000 * 1e6) return 80; // Lightning
        if (_principal >= 1000 * 1e6) return 50; // Thunder
        if (_principal >= 200 * 1e6)  return 30; // Surge
        if (_principal >= 100 * 1e6)  return 20; // Volt
        if (_principal >= 50 * 1e6)   return 10; // Spark
        return 5; // Default for < $50
    }

    function zapIn(uint256 _amount, address _referrer) external nonReentrant {
        require(_amount >= 10 * 1e6, "Min 10 USDC");
        require(_referrer != msg.sender, "No self-referral");

        UserInfo storage user = users[msg.sender];

        if (user.referrer == address(0) && _referrer != address(0)) {
            user.referrer = _referrer;
        }

        USDC.safeTransferFrom(msg.sender, address(this), _amount);
        USDC.approve(address(mUSDC), _amount);
        uint256 newShares = mUSDC.deposit(_amount, address(this));
        
        user.principal += _amount;
        user.shareBalance += newShares;
        user.lastDepositTime = block.timestamp;

        emit ZapIn(msg.sender, _amount, user.referrer);
    }

    function zapOut() external nonReentrant {
        UserInfo storage user = users[msg.sender];
        require(user.shareBalance > 0, "No balance");

        uint256 shares = user.shareBalance;
        uint256 principal = user.principal;
        uint256 depositTime = user.lastDepositTime;
        address refAddr = user.referrer;

        user.shareBalance = 0;
        user.principal = 0;

        mUSDC.redeem(shares, address(this), address(this));
        uint256 totalValue = mUSDC.convertToAssets(shares);

        if (block.timestamp < depositTime + LOCK_TIME) {
            uint256 penalty = (totalValue * EARLY_EXIT_PENALTY) / 100;
            totalProtocolFees += penalty;
            USDC.safeTransfer(msg.sender, totalValue - penalty);
            return;
        }

        uint256 profit = totalValue > principal ? totalValue - principal : 0;

        if (profit > 0) {
            // Check Referrer's Tier based on THEIR current principal
            uint256 refRate = 5; 
            if (refAddr != address(0)) {
                refRate = getReferralRate(users[refAddr].principal);
            }

            uint256 refPayout = (profit * refRate) / 100;
            uint256 ownerFee = (profit * PROTOCOL_FEE) / 100;
            
            // Ensure we don't over-pay if user has 80% + 5% fees
            uint256 totalDeductions = refPayout + ownerFee;
            uint256 userProfit = profit > totalDeductions ? profit - totalDeductions : 0;

            if (refAddr != address(0)) {
                USDC.safeTransfer(refAddr, refPayout);
                users[refAddr].totalReferralEarnings += refPayout;
            } else {
                totalProtocolFees += refPayout;
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

    function getReferralEarnings(address _user) external view returns (uint256) {
        return users[_user].totalReferralEarnings;
    }

    function collectFees() external onlyOwner {
        uint256 amount = totalProtocolFees;
        totalProtocolFees = 0;
        USDC.safeTransfer(owner(), amount);
    }
}