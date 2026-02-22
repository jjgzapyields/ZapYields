const contractABI = [
  "function createCode(string memory code) external",
  "function addReferrer(string memory code) external",
  "function walletToCode(address user) view returns (string)",
  "function codeToWallet(string code) view returns (address)",
  "function referrers(address user) view returns (address)",
  "function balanceOf(address account) view returns (uint256)",
  "event CodeCreated(address indexed user, string code)",
  "event ReferralBound(address indexed user, address indexed referrer, string codeUsed)",
  "event ReferralRewardPaid(address indexed referrer, address indexed user, uint256 amount)"
];

// ⚠️ PASTE YOUR DEPLOYED CONTRACT ADDRESS HERE
const contractAddress = "0x7253780d11314F149691d8d0F773EaA9d05dE5b4";