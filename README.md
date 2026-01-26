# ZapYields Mainnet Alpha ⚡

[![Network](https://img.shields.io/badge/Network-Base_Mainnet-blue)](https://base.org)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636.svg)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ZapYields is a decentralized yield aggregator built on the Base network. It simplifies access to institutional-grade DeFi by allowing users to deposit USDC into the $100M+ Moonwell Flagship MetaMorpho Vault with a single click, earning high-yield APY with zero price volatility.

---

## 📑 Table of Contents
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Smart Contract Details](#-smart-contract-details)
- [Frontend Integration](#-frontend-integration)
- [Usage Guide](#-usage-guide)
- [Security](#-security)
- [Roadmap (V2)](#-roadmap-v2)

---

## ✨ Features

* **1-Click Yield:** Streamlined UX for depositing USDC into complex MetaMorpho vaults.
* **Auto-Compounding:** Interest is automatically baked into the share value (ERC-4626 standard).
* **Live Yield Ticker:** Optimistic frontend rendering shows micro-yield growth every 50ms.
* **Decentralized Referral System:** Immutable on-chain tracking for user downlines.
* **Low Gas Fees:** Fully optimized for the Base L2 network.

---

## 🏗 System Architecture

The protocol uses a dual-layer approach:
1. **The Vault (Smart Contract):** Holds user state, accepts deposits, and interacts with the Moonwell standard interfaces.
2. **The Aggregator (Morpho):** The external yield source that lends the USDC to over-collateralized borrowers.

---

## 💻 Smart Contract Details

**Network:** Base Mainnet  
**USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`  
**Moonwell mUSDC Vault:** `0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca`  

### Core Functions

<details>
<summary><code>zapIn(uint256 _amount, address _referrer)</code></summary>

* Transfers user USDC to the contract.
* Registers the `_referrer` (if new user).
* Approves and deposits USDC into the Morpho Vault.
* Credits the user with corresponding Morpho Shares.
* *Min Deposit: 10 USDC*
</details>

<details>
<summary><code>zapOut()</code></summary>

* Checks user share balance.
* Redeems 100% of shares from Morpho back to USDC.
* Transfers Principal + Profit back to the user.
* Resets user ledger to `0`.
</details>

<details>
<summary><code>getAccountValue(address _user)</code></summary>

* A `view` function that interacts with Morpho's `convertToAssets` to calculate the live USD value of a user's shares.
</details>

---

## 🖥 Frontend Integration

The DApp uses standard HTML/CSS/JS with **Ethers.js (v5.7.2)** for Web3 connectivity.

**Key UI Logic (The Optimistic Ticker):**
Due to blockchain block times (2s), real-time yield is rendered optimistically using a JS interval:
```javascript
// Calculates growth per millisecond based on 9.1% APY
const growthPerMs = ((currentVal * 0.091) / 31536000) / 1000;

setInterval(() => {
  liveVal += (growthPerMs * 50);
  document.getElementById('yieldDisplay').innerText = liveVal.toFixed(6); 
}, 50);