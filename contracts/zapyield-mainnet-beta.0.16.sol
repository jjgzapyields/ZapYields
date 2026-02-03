// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Interface for Moonwell/Morpho Vaults
interface IMorphoVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function balanceOf(address account) external view returns (uint256);
}

contract ZapApyV2Pro is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // --- STATE VARIABLES (Do not reorder or remove in V3!) ---
    
    IERC20Upgradeable public usdcToken;
    IMorphoVault public moonwellVault;
    
    // Referral Database
    uint256 public nextReferralId;
    mapping(uint256 => address) public idToAddress; // ID -> Wallet
    mapping(address => uint256) public addressToId; // Wallet -> ID

    // User Data
    struct UserInfo {
        uint256 principal;      // Amount deposited
        uint256 depositTime;    // Timestamp of last deposit (for 76h lock)
        address referrer;       // Who referred them
    }
    mapping(address => UserInfo) public userInfo;

    // Events
    event ReferralIdCreated(address indexed user, uint256 indexed id);
    event ZappedIn(address indexed user, uint256 amount, uint256 referrerId);
    event Withdrawn(address indexed user, uint256 amount, uint256 penalty);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ==========================================
    // 1️⃣ INITIALIZER (Replaces Constructor)
    // ==========================================
    
    /**
     * @notice Initializes the proxy. This runs only once when you first deploy.
     * @param _usdc Address of the USDC Token on Base
     * @param _vault Address of the Moonwell/Morpho Vault
     */
    function initialize(address _usdc, address _vault) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        usdcToken = IERC20Upgradeable(_usdc);
        moonwellVault = IMorphoVault(_vault);
        
        // Initialize Referral Counter
        nextReferralId = 1000;
    }

    // ==========================================
    // 2️⃣ UPGRADE SECURITY
    // ==========================================
    
    /**
     * @notice Required by UUPS. Ensures only the owner can authorize an upgrade.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ==========================================
    // 3️⃣ REFERRAL SYSTEM
    // ==========================================

    function createReferralId() external {
        require(addressToId[msg.sender] == 0, "ZapApy: You already have an ID");
        
        uint256 newId = nextReferralId;
        
        idToAddress[newId] = msg.sender;
        addressToId[msg.sender] = newId;
        
        nextReferralId++;
        
        emit ReferralIdCreated(msg.sender, newId);
    }
    
    function getMyId() external view returns (uint256) {
        return addressToId[msg.sender];
    }

    // ==========================================
    // 4️⃣ ZAP & WITHDRAW LOGIC
    // ==========================================

    function zapIn(uint256 _amount, uint256 _referrerId) external nonReentrant {
        require(_amount > 0, "ZapApy: Amount must be > 0");

        // Resolve Referrer
        address referrerAddr = idToAddress[_referrerId];
        if (referrerAddr == address(0) || referrerAddr == msg.sender) {
            referrerAddr = address(0);
        }

        UserInfo storage user = userInfo[msg.sender];
        if (user.principal == 0) {
            user.referrer = referrerAddr;
        }

        user.principal += _amount;
        user.depositTime = block.timestamp;

        // Transfer & Deposit
        usdcToken.safeTransferFrom(msg.sender, address(this), _amount);
        usdcToken.forceApprove(address(moonwellVault), _amount);
        moonwellVault.deposit(_amount, address(this));

        emit ZappedIn(msg.sender, _amount, _referrerId);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.principal >= _amount, "ZapApy: Insufficient balance");

        // 1. Calculate Penalty (1% if < 76h)
        uint256 penalty = 0;
        if (block.timestamp < user.depositTime + 76 hours) {
            penalty = (_amount * 100) / 10000;
        }
        uint256 amountAfterPenalty = _amount - penalty;

        // 2. Withdraw from Vault (Logic simplified for assets=shares parity in demo)
        moonwellVault.withdraw(_amount, address(this), address(this));

        // 3. Mock Profit Calculation (Replace with real share-value math in prod)
        // For demo: Assuming standard principal return logic
        
        // 4. Transfer to User
        usdcToken.safeTransfer(msg.sender, amountAfterPenalty);
        user.principal -= _amount;
        
        emit Withdrawn(msg.sender, _amount, penalty);
    }

    // ==========================================
    // 5️⃣ STORAGE GAP (Critical for Upgrades)
    // ==========================================
    
    /**
     * @dev This empty reserved space ensures that if you add new variables in V3,
     * they won't overwrite existing memory.
     */
    uint256[50] private __gap;
}