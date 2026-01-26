const VAULT_ADDR = "0x671e4F904E07a392785E031c2b0B127329Eb4506"; 
const USDC_ADDR = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Updated ABI: Includes Tier Logic & Event Emitters
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

let signer, provider, vault, usdc;
let tickerInterval;

window.onload = () => {
  document.getElementById('connectBtn').onclick = connectWallet;
  document.getElementById('disconnectBtn').onclick = disconnectWallet;
  document.getElementById('approveBtn').onclick = handleApprove;
  document.getElementById('zapInBtn').onclick = handleZapIn;
  document.getElementById('zapOutBtn').onclick = handleZapOut;
  document.getElementById('copyRefBtn').onclick = copyReferral;

  if (window.ethereum && localStorage.getItem('isWalletConnected') === 'true') {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    provider.listAccounts().then(accs => { if (accs.length > 0) setupSession(accs[0]); });
  }
};

async function connectWallet(e) {
  if(e) e.preventDefault();
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: "0x2105" }] });
    const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
    localStorage.setItem('isWalletConnected', 'true');
    setupSession(accs[0]);
  } catch (err) { updateStatus("Failed to connect.", true); }
}

async function setupSession(addr) {
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  signer = provider.getSigner();
  vault = new ethers.Contract(VAULT_ADDR, V_ABI, signer);
  usdc = new ethers.Contract(USDC_ADDR, U_ABI, signer);

  document.getElementById('connectBtn').classList.add('hidden');
  document.getElementById('disconnectBtn').classList.remove('hidden');
  updateStatus("System Live", false);
  refreshStats(addr);
}

async function refreshStats(addr) {
  if (!addr || !ethers.utils.isAddress(addr)) return;

  try {
    const bal = await vault.getAccountValue(addr);
    const refEarns = await vault.getReferralEarnings(addr);
    const userData = await vault.users(addr);

    const principal = parseFloat(ethers.utils.formatUnits(userData.p, 6));
    const currentVal = parseFloat(ethers.utils.formatUnits(bal, 6));
    const profit = currentVal > principal ? currentVal - principal : 0;

    document.getElementById('principalDisplay').innerText = principal.toFixed(2);
    document.getElementById('profitDisplay').innerText = profit.toFixed(4);
    document.getElementById('refEarningsDisplay').innerText = parseFloat(ethers.utils.formatUnits(refEarns, 6)).toFixed(4);

    // --- BUTTON STATE MANAGEMENT ---
    if (principal > 0) {
      document.getElementById('zapOutBtn').classList.remove('disabled-btn');
    } else {
      document.getElementById('zapOutBtn').classList.add('disabled-btn');
    }

    // --- 🚨 FETCH LIVE REFERRAL TIER & RECRUITS ---
    try {
      const rate = await vault.getReferralRate(userData.p);
      const filter = vault.filters.ZapIn(null, null, addr);
      const logs = await vault.queryFilter(filter, -10000); // Scans last 10k blocks for speed
      const uniqueRecruits = new Set(logs.map(log => log.args.user)).size;

      document.getElementById('refCountDisplay').innerText = uniqueRecruits;
      
      // Optional: Log the rate to the console for testing
      console.log(`Current Referral Payout Tier: ${rate}%`);
    } catch (refErr) {
      console.warn("Event query failed:", refErr);
    }

    // --- REAL-TIME TICKER ---
    const growthPerSecond = ((currentVal * 0.091) / 31536000);
    document.getElementById('perSecondDisplay').innerText = growthPerSecond.toFixed(8);

    const growthPerMs = growthPerSecond / 1000;
    let liveVal = currentVal;
    clearInterval(tickerInterval);
    tickerInterval = setInterval(() => {
      liveVal += (growthPerMs * 50);
      document.getElementById('yieldDisplay').innerText = liveVal.toFixed(6); 
    }, 50);

  } catch (err) {
    console.error("Stats Error:", err);
  }
}

async function handleApprove(e) {
  if(e) e.preventDefault();
  const val = document.getElementById('amountInput').value;
  if (!val || val < 10) return updateStatus("Min 10 USDC", true);
  try {
    updateStatus("Approving USDC...", false);
    const tx = await usdc.approve(VAULT_ADDR, ethers.utils.parseUnits(val, 6));
    await tx.wait(); 
    updateStatus("Approved! Proceed to Zap In.", false);
    document.getElementById('zapInBtn').classList.remove('disabled-btn'); 
  } catch (err) { updateStatus("Approval Rejected", true); }
}

async function handleZapIn(e) {
  if(e) e.preventDefault();
  const val = document.getElementById('amountInput').value;
  const ref = new URLSearchParams(window.location.search).get('ref') || "0x0000000000000000000000000000000000000000";
  try {
    updateStatus("Deploying Capital...", false);
    const tx = await vault.zapIn(ethers.utils.parseUnits(val, 6), ref, { gasLimit: 400000 });
    await tx.wait();
    updateStatus("Zap Success! Yield active.", false);
    refreshStats(await signer.getAddress());
  } catch (err) { updateStatus("Zap Failed", true); }
}

async function handleZapOut(e) {
  if(e) e.preventDefault();
  try {
    updateStatus("Withdrawing...", false);
    const tx = await vault.zapOut({ gasLimit: 600000 });
    await tx.wait();
    updateStatus("Withdrawal Success!", false);
    refreshStats(await signer.getAddress());
  } catch (err) { updateStatus("Withdrawal Failed", true); }
}

async function copyReferral(e) {
  if(e) e.preventDefault();
  const addr = await signer.getAddress();
  const link = window.location.origin + window.location.pathname + "?ref=" + addr;
  navigator.clipboard.writeText(link);
  alert("Referral Link Copied! Spread the word to grow your commission tier.");
}

function disconnectWallet(e) {
  if(e) e.preventDefault();
  localStorage.setItem('isWalletConnected', 'false');
  window.location.reload();
}

function updateStatus(msg, isErr) {
  const s = document.getElementById('statusLabel');
  s.innerText = msg;
  s.className = isErr ? "status-msg status-error" : "status-msg";
}