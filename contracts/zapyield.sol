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

contract ZapYieldsVaultSepolia is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- BASE SEPOLIA TESTNET ADDRESSES ---
    IERC20 public constant USDC = IERC20(0x036CbD53842c5426634e7929541eC2318f3dCF7e); 
    IMToken public constant mUSDC = IMToken(0x403d64b3f6B4A2b095754877395ab3255476d081); 

    // --- CONSTANTS ---
    uint256 public constant MIN_INVESTMENT = 10 * 1e6;       // $10 USD Minimum (USDC is 6 decimals)
    uint256 public constant WITHDRAWAL_FEE_FLAT = 2 * 1e6;  // $2 Flat Fee
    uint256 public constant PROTOCOL_FEE_PERCENT = 10;      // 10% of Interest
    uint256 public constant EARLY_WITHDRAW_FEE = 1;         // 1% Early Exit Fee
    uint256 public constant LOCK_PERIOD = 36 hours;         // Withdrawal Lock Window

    struct UserInfo {
        uint256 principal;
        uint256 shareBalance;
        address referrer;
        uint256 totalEarned;
        uint256 lastDepositTime;
    }

    mapping(address => UserInfo) public users;
    mapping(address => uint256) public referralEarnings;
    mapping(address => address[]) public referralList; 

    // Events for better frontend tracking
    event Deposit(address indexed user, uint256 amount, address indexed referrer);
    event Withdraw(address indexed user, uint256 amount, uint256 fee);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Deposits USDC into the vault and mints mUSDC shares.
     * @param _amount Amount of USDC (must be >= 10 * 1e6).
     * @param _referrer Address of the user who referred the depositor.
     */
    function zapIn(uint256 _amount, address _referrer) external nonReentrant {
        require(_amount >= MIN_INVESTMENT, "Minimum investment is 10 USDC");
        require(_referrer != msg.sender, "No self-referral");

        // Set referrer only once
        if (users[msg.sender].referrer == address(0) && _referrer != address(0)) {
            users[msg.sender].referrer = _referrer;
            referralList[_referrer].push(msg.sender); 
        }

        // 1. Transfer USDC from user to contract
        USDC.safeTransferFrom(msg.sender, address(this), _amount);
        
        // 2. Approve and Mint Morpho mUSDC
        USDC.approve(address(mUSDC), _amount);
        uint256 preBal = mUSDC.balanceOf(address(this));
        require(mUSDC.mint(_amount) == 0, "Morpho Mint failed");
        uint256 newShares = mUSDC.balanceOf(address(this)) - preBal;

        // 3. Update User Record
        users[msg.sender].principal += _amount;
        users[msg.sender].shareBalance += newShares;
        users[msg.sender].lastDepositTime = block.timestamp;

        emit Deposit(msg.sender, _amount, _referrer);
    }

    /**
     * @dev Withdraws all shares and principal. Applies fees based on lock time.
     */
    function zapOut() external nonReentrant {
        UserInfo storage user = users[msg.sender];
        require(user.shareBalance > 0, "Empty balance");

        uint256 preUSDC = USDC.balanceOf(address(this));
        require(mUSDC.redeem(user.shareBalance) == 0, "Morpho Redeem failed");
        uint256 grossAmount = USDC.balanceOf(address(this)) - preUSDC;

        uint256 userPayout;
        uint256 totalFee;

        // Fee Logic
        if (block.timestamp < user.lastDepositTime + LOCK_PERIOD) {
            // Early Withdrawal: 1% flat penalty
            totalFee = (grossAmount * EARLY_WITHDRAW_FEE) / 100;
            userPayout = grossAmount - totalFee;
            USDC.safeTransfer(owner(), totalFee);
        } else {
            // Regular Withdrawal: Flat fee + Dev fee on interest
            uint256 flatFee = (grossAmount >= WITHDRAWAL_FEE_FLAT) ? WITHDRAWAL_FEE_FLAT : grossAmount;
            uint256 interest = (grossAmount - flatFee > user.principal) ? (grossAmount - flatFee) - user.principal : 0;
            uint256 devFee = (interest * PROTOCOL_FEE_PERCENT) / 100;

            // Handle Referrer Share from interest
            if (interest > 0 && user.referrer != address(0)) {
                uint256 refShare = (interest * getReferralTierPercent(user.referrer)) / 100;
                referralEarnings[user.referrer] += refShare;
                userPayout = (grossAmount - flatFee) - devFee - refShare;
            } else {
                userPayout = (grossAmount - flatFee) - devFee;
            }
            totalFee = flatFee + devFee;
            USDC.safeTransfer(owner(), totalFee);
        }

        // Reset User Stats
        user.principal = 0;
        user.shareBalance = 0;
        
        USDC.safeTransfer(msg.sender, userPayout);
        emit Withdraw(msg.sender, userPayout, totalFee);
    }

    function getDownlines(address _user) external view returns (address[] memory) {
        return referralList[_user];
    }

    function getReferralTierPercent(address _user) public view returns (uint256) {
        uint256 bal = users[_user].principal;
        if (bal >= 5000 * 1e6) return 80; // 80% of interest to top tier
        if (bal >= 1000 * 1e6) return 50; 
        if (bal >= 200 * 1e6) return 30; 
        if (bal >= 100 * 1e6) return 20; 
        if (bal >= 50 * 1e6) return 10; 
        return 0;
    }

    function getAccountValue(address _user) external view returns (uint256) {
        uint256 rate = mUSDC.exchangeRateStored();
        // Morpho uses 1e18 scaling for exchange rates
        return (users[_user].shareBalance * rate) / 1e18;
    }

    function getTimeUntilFree(address _user) external view returns (uint256) {
        uint256 unlock = users[_user].lastDepositTime + LOCK_PERIOD;
        return (block.timestamp >= unlock) ? 0 : unlock - block.timestamp;
    }
}