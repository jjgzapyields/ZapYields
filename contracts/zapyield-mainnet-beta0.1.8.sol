// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// --- IMPORTS ---
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
}

contract ZapApyV3 is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // --- STATE VARIABLES ---
    IERC20Upgradeable public usdcToken;
    IMorphoVault public moonwellVault;

    // --- REFERRAL SYSTEM (Strings) ---
    // Mapping: Code "K9X2M" -> Wallet Address
    mapping(string => address) public codeToAddress;    
    // Mapping: Wallet Address -> Code "K9X2M"
    mapping(address => string) public addressToCode;    
    
    // Alphabet for random generation
    bytes constant ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // User Data
    struct UserInfo {
        uint256 principal;
        uint256 depositTime;
        address referrer;
    }
    mapping(address => UserInfo) public userInfo;

    // Events
    event ReferralCodeCreated(address indexed user, string code);
    event ZappedIn(address indexed user, uint256 amount, string referrerCode);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // --- INITIALIZER ---
    function initialize(address _usdc, address _vault) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        usdcToken = IERC20Upgradeable(_usdc);
        moonwellVault = IMorphoVault(_vault);
    }

    // --- UUPS UPGRADE AUTHORIZATION ---
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ==========================================
    // 1️⃣ GENERATE RANDOM CODE
    // ==========================================
    function createReferralCode() external {
        // 1. Check if user already has a code
        require(bytes(addressToCode[msg.sender]).length == 0, "ZapApy: You already have a code");

        // 2. Generate 7-char Random String
        string memory newCode = _generateRandomString();
        
        // 3. Ensure uniqueness (Collision check)
        require(codeToAddress[newCode] == address(0), "ZapApy: Code collision, try again");

        // 4. Save to Database
        codeToAddress[newCode] = msg.sender;
        addressToCode[msg.sender] = newCode;

        emit ReferralCodeCreated(msg.sender, newCode);
    }

    // Internal helper to create "A7X9..."
    function _generateRandomString() internal view returns (string memory) {
        bytes memory code = new bytes(7);
        // Create pseudo-randomness
        uint256 randomness = uint256(keccak256(abi.encodePacked(msg.sender, block.timestamp, block.prevrandao)));
        
        for (uint i = 0; i < 7; i++) {
            code[i] = ALPHABET[randomness % 36];
            randomness /= 36;
        }
        return string(code);
    }
    
    // ==========================================
    // 2️⃣ ZAP IN (STRICT VALIDATION)
    // ==========================================
    function zapIn(uint256 _amount, string memory _referrerCode) external nonReentrant {
        require(_amount > 0, "ZapApy: Amount must be > 0");
        
        // --- MANDATORY CHECKS ---
        require(bytes(_referrerCode).length > 0, "ZapApy: Referral Code is REQUIRED");
        
        // 1. Lookup Referrer Address
        address referrerAddr = codeToAddress[_referrerCode];
        
        // 2. Strict Validation
        require(referrerAddr != address(0), "ZapApy: Invalid Referral Code");
        require(referrerAddr != msg.sender, "ZapApy: Cannot refer yourself");

        // 3. Update User State
        UserInfo storage user = userInfo[msg.sender];
        if (user.principal == 0) {
            user.referrer = referrerAddr;
        }
        user.principal += _amount;
        user.depositTime = block.timestamp;

        // 4. Transfer & Deposit
        usdcToken.safeTransferFrom(msg.sender, address(this), _amount);
        usdcToken.forceApprove(address(moonwellVault), _amount);
        moonwellVault.deposit(_amount, address(this));

        emit ZappedIn(msg.sender, _amount, _referrerCode);
    }

    // Helper to get your own code in frontend
    function getMyCode() external view returns (string memory) {
        return addressToCode[msg.sender];
    }
}