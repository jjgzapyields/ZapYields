// --- CONFIGURATION ---
const PROXY_ADDRESS = "0x8b0eb44Bb39239Ed852d2bCE54157f2DA0d6c08F"; // <--- PASTE NEW CONTRACT ADDRESS
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

// --- NEW ABI (Supports Strings) ---
const CONTRACT_ABI = [
  "function zapIn(uint256 amount, string memory referrerCode) external",
  "function createReferralCode() external",
  "function getMyCode() external view returns (string memory)"
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

let provider, signer, contract, usdcContract, userAddress;

// 1. Connect Wallet
async function connectWallet() {
  if (typeof window.ethereum === 'undefined') return alert("MetaMask not found!");

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    // Enforce Base Network
    const { chainId } = await provider.getNetwork();
    if (chainId !== 8453) {
      try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }] 
        });
      } catch(e) { return alert("Please switch wallet to Base Network."); }
    }

    contract = new ethers.Contract(PROXY_ADDRESS, CONTRACT_ABI, signer);
    usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);

    // Update UI
    document.getElementById("connectBtn").innerText = userAddress.slice(0,6) + "...";
    document.getElementById("connectBtn").style.background = "#27272a";
    
    checkMyCode();
    updateBalance();

  } catch (err) { alert("Connection Failed: " + err.message); }
}

// 2. Check & Display Code
async function checkMyCode() {
  try {
    const code = await contract.getMyCode();
    
    // Check if code exists (not empty)
    if (code && code.length > 0) {
      document.getElementById("myRefCode").innerText = code;
      document.getElementById("idStatus").innerText = "Active";
      document.getElementById("generateSection").style.display = "none";
      document.getElementById("copyBtn").style.display = "inline-flex"; // Show Copy Button
    } else {
      document.getElementById("myRefCode").innerText = "---";
      document.getElementById("idStatus").innerText = "Generate below";
      document.getElementById("generateSection").style.display = "block";
      document.getElementById("copyBtn").style.display = "none";
    }
  } catch (err) { console.log("New user state"); }
}

// 3. Generate Random Code
async function createReferralCode() {
  try {
    const tx = await contract.createReferralCode();
    document.getElementById("idStatus").innerText = "Generating...";
    await tx.wait();
    checkMyCode();
    alert("Referral Code Generated!");
  } catch (err) { alert("Error: " + (err.reason || err.message)); }
}

// 4. Zap In (Logic Updated for Strings)
async function zapIn() {
  const amount = document.getElementById("zapAmount").value;
  let code = document.getElementById("referrerCode").value;
  
  // Sanitize Input (Uppercase, Trim)
  if (!code) code = ""; 
  code = code.trim().toUpperCase();

  if (!amount) return alert("Please enter an amount.");

  try {
    const amountWei = ethers.utils.parseUnits(amount, 6); 

    // Check Allowance
    const allowance = await usdcContract.allowance(userAddress, PROXY_ADDRESS);
    if (allowance.lt(amountWei)) {
      const tx = await usdcContract.approve(PROXY_ADDRESS, amountWei);
      document.getElementById("connectBtn").innerText = "Approving...";
      await tx.wait();
    }

    // Execute Zap
    const tx = await contract.zapIn(amountWei, code);
    document.getElementById("connectBtn").innerText = "Zapping...";
    await tx.wait();
    
    alert("Zap Successful! ⚡");
    updateBalance();
    document.getElementById("connectBtn").innerText = "Connected";
  } catch (err) {
    console.error(err);
    alert("Failed: " + (err.reason || err.message));
    document.getElementById("connectBtn").innerText = "Connected";
  }
}

// 5. Helper: Update Balance
async function updateBalance() {
  try {
    const bal = await usdcContract.balanceOf(userAddress);
    document.getElementById("userBalance").innerText = "$" + ethers.utils.formatUnits(bal, 6);
  } catch(e) {}
}

// 6. UI Feature: Copy to Clipboard
function copyToClipboard() {
  const code = document.getElementById("myRefCode").innerText;
  if(code === "---" || !code) return;
  
  navigator.clipboard.writeText(code).then(() => {
    // Visual feedback
    const btn = document.getElementById("copyBtn");
    const originalHTML = btn.innerHTML;
    btn.innerHTML = "✓"; // Quick checkmark
    setTimeout(() => { btn.innerHTML = originalHTML; }, 1500);
  });
}