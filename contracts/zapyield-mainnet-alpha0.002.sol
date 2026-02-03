// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ----------------------------------------------------------------------------
// OpenZeppelin Interfaces and Libraries (Flattened for Verification)
// ----------------------------------------------------------------------------

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

library Address {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}

library SafeERC20 {
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        require(token.transfer(to, value), "SafeERC20: ERC20 operation did not succeed");
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        require(token.transferFrom(from, to, value), "SafeERC20: ERC20 operation did not succeed");
    }
}

abstract contract Ownable {
    address private _owner;

    constructor(address initialOwner) {
        _owner = initialOwner;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// ----------------------------------------------------------------------------
// ERC-4626 MetaMorpho Interface (Base Mainnet Standard)
// ----------------------------------------------------------------------------
interface IMorphoVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function convertToAssets(uint256 shares) external view returns (uint256);
}

// ----------------------------------------------------------------------------
// ZapYields Mainnet Production Contract (v3)
// ----------------------------------------------------------------------------

contract ZapYieldsMainnetLive is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // BASE MAINNET ADDRESSES (Checksummed)
    IERC20 public constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913); 
    IMorphoVault public constant mUSDC = IMorphoVault(0x1686616428c04907aB37A8987B7a97260714E290); 

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
        
        // BASE MAINNET FIX: Using ERC-4626 'deposit'
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

        // BASE MAINNET FIX: Using ERC-4626 'redeem'
        mUSDC.redeem(shares, address(this), address(this));
        uint256 balance = USDC.balanceOf(address(this));
        USDC.safeTransfer(msg.sender, balance);
    }

    function getAccountValue(address _user) external view returns (uint256) {
        // BASE MAINNET FIX: MetaMorpho uses 'convertToAssets' for exchange rates
        return mUSDC.convertToAssets(users[_user].shareBalance);
    }

    function getDownlines(address _user) external view returns (address[] memory) {
        return referralList[_user];
    }
}