const VAULT_ADDR = "0x971aEa41fb10bED7613838B1ad730b6B33494969"; 
const USDC_ADDR = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const V_ABI = [
  "function zapIn(uint256 a, address r) external",
  "function zapOut() external",
  "function getAccountValue(address u) view returns (uint256)",
  "function users(address) view returns (uint256 p, uint256 s, address ref, uint256 earn, uint256 time)",
  "event ZapIn(address indexed user, uint256 amount, address indexed referrer)"
];
const U_ABI = ["function approve(address s, uint256 a) public returns (bool)"];

const TIERS = [
  { name: "Spark", min: 50 },
  { name: "Volt", min: 100 },
  { name: "Surge", min: 200 },
  { name: "Thunder", min: 1000 },
  { name: "Lightning", min: 5000 }
];

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
    const { chainId } = await provider.getNetwork();
    if (chainId !== 8453) await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: "0x2105" }] });
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    setupSession(addr);
  } catch (err) { updateStatus("Connection Failed", true); }
}

async function setupSession(addr) {
  vault = new ethers.Contract(VAULT_ADDR, V_ABI, signer);
  usdc = new ethers.Contract(USDC_ADDR, U_ABI, signer);
  localStorage.setItem('isWalletConnected', 'true');
  document.getElementById('connectBtn').classList.add('hidden');
  document.getElementById('disconnectBtn').classList.remove('hidden');
  refreshStats(addr);
}

async function refreshStats(addr) {
  try {
    const bal = await vault.getAccountValue(addr);
    const userData = await vault.users(addr);
    const principal = parseFloat(ethers.utils.formatUnits(userData.p, 6));
    const currentVal = parseFloat(ethers.utils.formatUnits(bal, 6));
    const liveApy = 9.10; 

    document.getElementById('principalDisplay').innerText = principal.toFixed(2);
    document.getElementById('refEarningsDisplay').innerText = parseFloat(ethers.utils.formatUnits(userData.earn, 6)).toFixed(4);
    if (principal > 0) document.getElementById('zapOutBtn').classList.remove('disabled-btn');

    // Update Tier Bar
    updateTierProgress(principal);

    const growthPerSec = (currentVal * (liveApy / 100)) / 31536000;
    document.getElementById('perSecondDisplay').innerText = growthPerSec.toFixed(8);
    let liveVal = currentVal;
    clearInterval(tickerInterval);
    tickerInterval = setInterval(() => {
      liveVal += (growthPerSec / 20);
      document.getElementById('yieldDisplay').innerText = liveVal.toFixed(6);
    }, 50);
  } catch (e) { console.error(e); }
}

function updateTierProgress(principal) {
  let currentTierIndex = -1;
  for (let i = 0; i < TIERS.length; i++) {
    if (principal >= TIERS[i].min) currentTierIndex = i;
  }
  const nextTier = TIERS[currentTierIndex + 1];
  const bar = document.getElementById('tierProgressBar');
  const label = document.getElementById('nextTierLabel');
  const percentLabel = document.getElementById('tierPercent');

  if (nextTier) {
    const prevMin = currentTierIndex === -1 ? 0 : TIERS[currentTierIndex].min;
    const progress = ((principal - prevMin) / (nextTier.min - prevMin)) * 100;
    bar.style.width = `${Math.min(progress, 100)}%`;
    label.innerText = `Next Tier: ${nextTier.name} ($${nextTier.min})`;
    percentLabel.innerText = `${Math.floor(progress)}%`;
  } else {
    bar.style.width = "100%";
    label.innerText = "MAX TIER REACHED ⚡";
    percentLabel.innerText = "100%";
  }
}

async function handleZapOut() {
  const addr = await signer.getAddress();
  const userData = await vault.users(addr);
  const lockPeriod = 76 * 3600; 
  if (Math.floor(Date.now() / 1000) - userData.time.toNumber() < lockPeriod) {
    const modal = document.getElementById('warningModal');
    modal.style.display = 'flex';
    document.getElementById('confirmZapOut').onclick = () => { modal.style.display = 'none'; executeZapOut(); };
    document.getElementById('cancelZapOut').onclick = () => { modal.style.display = 'none'; };
  } else { executeZapOut(); }
}

async function executeZapOut() {
  try {
    updateStatus("Withdrawing...", false);
    const tx = await vault.zapOut({ gasLimit: 500000 });
    await tx.wait();
    location.reload();
  } catch (e) { updateStatus("Error", true); }
}

async function handleApprove() {
  const val = document.getElementById('amountInput').value;
  try {
    const tx = await usdc.approve(VAULT_ADDR, ethers.utils.parseUnits(val, 6));
    await tx.wait();
    document.getElementById('zapInBtn').classList.remove('disabled-btn');
  } catch (e) { updateStatus("Fail", true); }
}

async function handleZapIn() {
  const val = document.getElementById('amountInput').value;
  const ref = new URLSearchParams(window.location.search).get('ref') || "0x0000000000000000000000000000000000000000";
  try {
    const tx = await vault.zapIn(ethers.utils.parseUnits(val, 6), ref, { gasLimit: 300000 });
    await tx.wait();
    location.reload();
  } catch (e) { updateStatus("Fail", true); }
}

async function copyReferral() {
  const addr = await signer.getAddress();
  navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?ref=${addr}`);
  alert("Link Copied!");
}

function disconnectWallet() { localStorage.setItem('isWalletConnected', 'false'); location.reload(); }
function updateStatus(m, e) { const s = document.getElementById('statusLabel'); s.innerText = m; s.className = e ? "status-msg status-error" : "status-msg"; }