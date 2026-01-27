// --- 🚨 PASTE YOUR REDEPLOYED CONTRACT ADDRESS HERE 🚨 ---
const VAULT_ADDR = "0x671e4f904e07a392785e031c2b0b127329eb4506"; 
const USDC_ADDR = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Updated ABI: Includes Tier Logic, APY, and Event Emitters
const V_ABI = [
  "function zapIn(uint256 a, address r) external",
  "function zapOut() external",
  "function getAccountValue(address u) view returns (uint256)",
  "function getReferralEarnings(address u) view returns (uint256)",
  "function getReferralRate(uint256 p) view returns (uint256)", 
  "function users(address) view returns (uint256 p, uint256 s, address ref, uint256 earn, uint256 time)",
  "event ZapIn(address indexed user, uint256 amount, address indexed referrer)"
];
const U_ABI = ["function approve(address s, uint256 a) public returns (bool)"];

let signer, provider, vault, usdc, tickerInterval;

window.onload = () => {
  document.getElementById('connectBtn').onclick = connectWallet;
  document.getElementById('disconnectBtn').onclick = disconnectWallet;
  document.getElementById('approveBtn').onclick = handleApprove;
  document.getElementById('zapInBtn').onclick = handleZapIn;
  document.getElementById('zapOutBtn').onclick = handleZapOut;
  document.getElementById('copyRefBtn').onclick = copyReferral;

  if (window.ethereum && localStorage.getItem('isWalletConnected') === 'true') {
    connectWallet();
  }
};

async function connectWallet() {
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    
    // Check for Base Mainnet (chainId 8453)
    const { chainId } = await provider.getNetwork();
    if (chainId !== 8453) {
      try {
        await window.ethereum.request({ 
          method: 'wallet_switchEthereumChain', 
          params: [{ chainId: "0x2105" }] 
        });
      } catch (switchError) {
        updateStatus("Please switch to Base Network", true);
        return;
      }
    }
    
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    setupSession(addr);
  } catch (err) {
    updateStatus("Connection Failed", true);
  }
}

async function setupSession(addr) {
  vault = new ethers.Contract(VAULT_ADDR, V_ABI, signer);
  usdc = new ethers.Contract(USDC_ADDR, U_ABI, signer);
  
  localStorage.setItem('isWalletConnected', 'true');
  document.getElementById('connectBtn').classList.add('hidden');
  document.getElementById('disconnectBtn').classList.remove('hidden');
  updateStatus("System Live", false);
  
  refreshStats(addr);
}

async function refreshStats(addr) {
  if (!addr || !ethers.utils.isAddress(addr)) return;

  try {
    // 1. Fetch User Data & Balances
    const bal = await vault.getAccountValue(addr);
    const userData = await vault.users(addr);
    const principal = parseFloat(ethers.utils.formatUnits(userData.p, 6));
    const currentVal = parseFloat(ethers.utils.formatUnits(bal, 6));
    const profit = currentVal > principal ? currentVal - principal : 0;

    // 2. Fetch Live APY (Example uses 4.14% based on current Morpho Vault data)
    // In a fully dynamic setup, this would fetch from Morpho's 'avgNetApy'
    const liveApy = 4.14; 
    document.getElementById('apyDisplay').innerText = liveApy.toFixed(2);

    // 3. UI Updates
    document.getElementById('principalDisplay').innerText = principal.toFixed(2);
    document.getElementById('refEarningsDisplay').innerText = parseFloat(ethers.utils.formatUnits(userData.earn, 6)).toFixed(4);

    if (principal > 0) {
      document.getElementById('zapOutBtn').classList.remove('disabled-btn');
    }

    // 4. Fetch Referral Count via Logs
    try {
      const filter = vault.filters.ZapIn(null, null, addr);
      const logs = await vault.queryFilter(filter, -10000); // Scan last 10k blocks
      document.getElementById('refCountDisplay').innerText = new Set(logs.map(l => l.args.user)).size;
    } catch (logErr) { console.warn("Log fetch failed", logErr); }

    // 5. Real-Time Growth Ticker
    // Calculation: (Current Value * APY) / Seconds in a Year
    const growthPerSec = (currentVal * (liveApy / 100)) / 31536000;
    document.getElementById('perSecondDisplay').innerText = growthPerSec.toFixed(8);

    let liveVal = currentVal;
    clearInterval(tickerInterval);
    tickerInterval = setInterval(() => {
      liveVal += (growthPerSec / 20); // Update every 50ms (20x per sec)
      document.getElementById('yieldDisplay').innerText = liveVal.toFixed(6);
    }, 50);

  } catch (err) {
    console.error("Refresh Error:", err);
  }
}

async function handleApprove() {
  const val = document.getElementById('amountInput').value;
  if (val < 10) return updateStatus("Min 10 USDC required", true);
  try {
    updateStatus("Approving USDC...", false);
    const tx = await usdc.approve(VAULT_ADDR, ethers.utils.parseUnits(val, 6));
    await tx.wait();
    updateStatus("USDC Approved!", false);
    document.getElementById('zapInBtn').classList.remove('disabled-btn');
  } catch (e) { updateStatus("Approval Failed", true); }
}

async function handleZapIn() {
  const val = document.getElementById('amountInput').value;
  const ref = new URLSearchParams(window.location.search).get('ref') || "0x0000000000000000000000000000000000000000";
  try {
    updateStatus("Zapping In...", false);
    const tx = await vault.zapIn(ethers.utils.parseUnits(val, 6), ref, { gasLimit: 300000 });
    await tx.wait();
    location.reload(); // Refresh to show new principal
  } catch (e) { updateStatus("Zap Failed", true); }
}

async function handleZapOut() {
  try {
    updateStatus("Withdrawing...", false);
    const tx = await vault.zapOut({ gasLimit: 500000 });
    await tx.wait();
    location.reload();
  } catch (e) { updateStatus("Withdrawal Error", true); }
}

async function copyReferral() {
  const addr = await signer.getAddress();
  const link = `${window.location.origin}${window.location.pathname}?ref=${addr}`;
  navigator.clipboard.writeText(link);
  alert("Referral Link Copied!");
}

function disconnectWallet() {
  localStorage.setItem('isWalletConnected', 'false');
  location.reload();
}

function updateStatus(m, e) {
  const s = document.getElementById('statusLabel');
  s.innerText = m;
  s.className = e ? "status-msg status-error" : "status-msg";
}