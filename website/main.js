// --- CONFIGURATION ---
const PROXY_ADDRESS = "0x971aEa41fb10bED7613838B1ad730b6B33494969"; // <--- PASTE REMIX ADDRESS HERE
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

// --- ABI DEFINITIONS ---
const CONTRACT_ABI = [
  "function zapIn(uint256 amount, uint256 referrerId) external",
  "function createReferralId() external",
  "function getMyId() external view returns (uint256)",
  "function userInfo(address) external view returns (uint256, uint256, address)"
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

let provider, signer, contract, usdcContract, userAddress;

// --- 1. CONNECT WALLET ---
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') return alert("Please install MetaMask!");

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    
    // Switch to Base Chain (ID: 8453)
    const { chainId } = await provider.getNetwork();
    if (chainId !== 8453) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 in Hex
        });
      } catch (e) {
        return alert("Please switch your wallet network to Base Mainnet.");
      }
    }

    // Init Contracts
    contract = new ethers.Contract(PROXY_ADDRESS, CONTRACT_ABI, signer);
    usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

    // Update UI
    document.getElementById("connectBtn").innerText = userAddress.slice(0,6) + "..." + userAddress.slice(-4);
    document.getElementById("connectBtn").style.background = "#27272a";
    
    // Load Data
    checkMyId();
    updateBalance();
    
  } catch (err) {
    console.error(err);
    alert("Connection Error: " + err.message);
  }
}

// --- 2. CHECK ID ---
async function checkMyId() {
  try {
    const id = await contract.getMyId();
    if (id.toString() !== "0") {
      document.getElementById("myRefId").innerText = "#" + id.toString();
      document.getElementById("idStatus").innerText = "Active";
      document.getElementById("generateSection").style.display = "none";
    } else {
      document.getElementById("myRefId").innerText = "None";
      document.getElementById("idStatus").innerText = "Generate below";
      document.getElementById("generateSection").style.display = "block";
    }
  } catch (err) { console.log("User likely new."); }
}

// --- 3. GENERATE ID ---
async function createReferralId() {
  try {
    const tx = await contract.createReferralId();
    document.getElementById("idStatus").innerText = "Generating...";
    await tx.wait();
    checkMyId();
    alert("Referral ID Generated! ⚡");
  } catch (err) {
    alert("Error: " + (err.reason || err.message));
  }
}

// --- 4. UPDATE BALANCE ---
async function updateBalance() {
  try {
    const bal = await usdcContract.balanceOf(userAddress);
    document.getElementById("userBalance").innerText = "$" + ethers.utils.formatUnits(bal, 6);
  } catch (e) {}
}

// --- 5. ZAP IN (ANTI-DRAIN LOGIC) ---
async function zapIn() {
  const amount = document.getElementById("zapAmount").value;
  const refId = document.getElementById("referrerId").value;

  if (!amount || !refId) return alert("Please enter Amount and Referrer ID.");

  try {
    // Convert to Wei (6 decimals for USDC)
    const amountWei = ethers.utils.parseUnits(amount, 6); 

    // Step A: Check Allowance
    const allowance = await usdcContract.allowance(userAddress, PROXY_ADDRESS);
    
    if (allowance.lt(amountWei)) {
      // Step B: Approve EXACT Amount
      const approveTx = await usdcContract.approve(PROXY_ADDRESS, amountWei);
      document.getElementById("connectBtn").innerText = "Approving...";
      await approveTx.wait();
    }

    // Step C: Zap In
    const zapTx = await contract.zapIn(amountWei, refId);
    document.getElementById("connectBtn").innerText = "Zapping...";
    await zapTx.wait();
    
    alert("Success! Liquidity Deposited. ⚡");
    updateBalance();
    document.getElementById("connectBtn").innerText = "Connected";
    
  } catch (err) {
    console.error(err);
    alert("Transaction Failed: " + (err.reason || err.message));
    document.getElementById("connectBtn").innerText = "Connected";
  }
}