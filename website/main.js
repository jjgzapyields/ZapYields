// --- CONFIGURATION ---
const PROXY_ADDRESS = "0x555FA27c3807D744daCB08AE6821645A7c380eC4"; // <--- PASTE NEW CONTRACT ADDRESS
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

// --- ABI ---
const CONTRACT_ABI = [
  "function zapIn(uint256 amount, string memory referrerCode) external",
  "function createReferralCode() external",
  "function getMyCode() external view returns (string memory)",
  "event ReferralCodeCreated(address indexed user, string code)",
  "event ZappedIn(address indexed user, uint256 amount, string referrerCode)"
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

let provider, signer, contract, usdcContract, userAddress;

// 1. Connect Wallet (Auto-Connect Support)
async function connectWallet(silent = false) {
  if (typeof window.ethereum === 'undefined') {
    if (!silent) alert("MetaMask not found!");
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Request accounts
    const accounts = await provider.send("eth_requestAccounts", []);
    if (accounts.length === 0) return;

    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    // Enforce Base Network
    const { chainId } = await provider.getNetwork();
    if (chainId !== 8453) {
      if (!silent) {
        try {
          await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2105' }] 
          });
        } catch(e) { return alert("Please switch wallet to Base Network."); }
      } else {
        return; 
      }
    }

    contract = new ethers.Contract(PROXY_ADDRESS, CONTRACT_ABI, signer);
    usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

    // Update UI
    document.getElementById("connectBtn").innerText = userAddress.slice(0,6) + "...";
    document.getElementById("connectBtn").style.background = "#27272a";
    document.getElementById("connectBtn").style.border = "1px solid #10b981"; 
    
    refreshData();
    setupEventListeners();

  } catch (err) { 
    if (!silent) alert("Connection Failed: " + err.message); 
  }
}

// 2. Central Refresh
async function refreshData() {
  await Promise.all([
    checkMyCode(),
    updateBalance()
  ]);
}

// 3. Listeners
function setupEventListeners() {
  if (!contract || !usdcContract) return;

  contract.on("ReferralCodeCreated", (user, code) => {
    if (user.toLowerCase() === userAddress.toLowerCase()) checkMyCode();
  });

  contract.on("ZappedIn", (user, amount, ref) => {
    if (user.toLowerCase() === userAddress.toLowerCase()) updateBalance();
  });
  
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }
}

// 4. Check Code
async function checkMyCode() {
  try {
    const code = await contract.getMyCode();
    if (code && code.length > 0) {
      document.getElementById("myRefCode").innerText = code;
      document.getElementById("idStatus").innerText = "Active";
      document.getElementById("generateSection").style.display = "none";
      document.getElementById("copyBtn").style.display = "inline-flex"; 
    } else {
      document.getElementById("myRefCode").innerText = "---";
      document.getElementById("idStatus").innerText = "Generate below";
      document.getElementById("generateSection").style.display = "block";
      document.getElementById("copyBtn").style.display = "none";
    }
  } catch (err) { console.log("New user state"); }
}

// 5. Generate Code
async function createReferralCode() {
  try {
    const tx = await contract.createReferralCode();
    document.getElementById("idStatus").innerText = "Generating...";
    await tx.wait();
    refreshData();
    alert("Referral Code Generated!");
  } catch (err) { alert("Error: " + (err.reason || err.message)); }
}

// 6. Zap In (MANDATORY CODE CHECK)
async function zapIn() {
  const amount = document.getElementById("zapAmount").value;
  let code = document.getElementById("referrerCode").value;
  
  if (!code) code = ""; 
  code = code.trim().toUpperCase();

  // --- VALIDATION BLOCK ---
  if (!amount || parseFloat(amount) <= 0) {
    return alert("Please enter a valid amount.");
  }

  // STOP: Require Code
  if (code.length === 0) {
    return alert("⚠️ Referral Code is REQUIRED to Zap in.");
  }

  try {
    const amountWei = ethers.utils.parseUnits(amount, 6); 
    const allowance = await usdcContract.allowance(userAddress, PROXY_ADDRESS);
    
    if (allowance.lt(amountWei)) {
      const tx = await usdcContract.approve(PROXY_ADDRESS, amountWei);
      document.getElementById("connectBtn").innerText = "Approving...";
      await tx.wait();
    }

    const tx = await contract.zapIn(amountWei, code);
    document.getElementById("connectBtn").innerText = "Zapping...";
    await tx.wait();
    
    refreshData();
    alert("Zap Successful! ⚡");
    document.getElementById("connectBtn").innerText = userAddress.slice(0,6) + "...";
    
  } catch (err) {
    console.error(err);
    
    // Parse Smart Contract Error Messages
    let msg = err.reason || err.message;
    if(msg.includes("Invalid Referral Code")) msg = "❌ That Referral Code does not exist!";
    if(msg.includes("Cannot refer yourself")) msg = "❌ You cannot use your own code!";
    
    alert("Transaction Failed: " + msg);
    document.getElementById("connectBtn").innerText = userAddress.slice(0,6) + "...";
  }
}

// 7. Update Balance
async function updateBalance() {
  try {
    const bal = await usdcContract.balanceOf(userAddress);
    document.getElementById("userBalance").innerText = "$" + ethers.utils.formatUnits(bal, 6);
  } catch(e) {}
}

// 8. Copy to Clipboard
function copyToClipboard() {
  const code = document.getElementById("myRefCode").innerText;
  if(code === "---" || !code) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById("copyBtn");
    const originalHTML = btn.innerHTML;
    btn.innerHTML = "✓"; 
    setTimeout(() => { btn.innerHTML = originalHTML; }, 1500);
  });
}

// 9. Auto-Connect
window.addEventListener('load', async () => {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) connectWallet(true);
  }
});