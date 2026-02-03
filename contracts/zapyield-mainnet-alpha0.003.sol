// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// THE FIX: ERC-4626 MetaMorpho Interface
interface IMorphoVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function convertToAssets(uint256 shares) external view returns (uint256);
}

contract ZapYieldsMainnetLive is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // BASE MAINNET NATIVE USDC
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); 
    
    // MOONWELL METAMORPHO VAULT (BASE MAINNET)
    IMorphoVault public constant mUSDC = IMorphoVault(0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca);

    uint256 public constant MIN_INVESTMENT = 10 * 1e6; 

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
        
        // BASE MAINNET FIX: Uses 'deposit'
        uint256 newShares = mUSDC.deposit(_amount, address(this));
        require(newShares > 0, "Morpho Deposit failed");

        users[msg.sender].principal += _amount;
        users[msg.sender].shareBalance += newShares;
    }

    function zapOut() external nonReentrant {
        UserInfo storage user = users[msg.sender];
        require(user.shareBalance > 0, "No balance");

        uint256 shares = user.shareBalance;
        user.shareBalance = 0;
        user.principal = 0;

        // BASE MAINNET FIX: Uses 'redeem'
        mUSDC.redeem(shares, address(this), address(this));
        uint256 balance = USDC.balanceOf(address(this));
        USDC.safeTransfer(msg.sender, balance);
    }

    function getAccountValue(address _user) external view returns (uint256) {
        // BASE MAINNET FIX: Uses 'convertToAssets'
        return mUSDC.convertToAssets(users[_user].shareBalance);
    }

    function getDownlines(address _user) external view returns (address[] memory) {
        return referralList[_user];
    }
}