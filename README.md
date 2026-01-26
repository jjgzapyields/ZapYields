# ZapApy V2 Pro ⚡

[![Network](https://img.shields.io/badge/Network-Base_Mainnet-blue)](https://base.org)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636.svg)](https://soliditylang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ZapApy V2 is a decentralized yield aggregator and profit-sharing system built on the Base network. It simplifies access to institutional-grade DeFi while providing automated financial incentives for users to grow the network.

---

## 📑 Table of Contents
- [V2 Features](#-v2-features)
- [Profit Sharing & Penalty Logic](#-profit-sharing--penalty-logic)
- [Smart Contract Details](#-smart-contract-details)
- [Frontend Capabilities](#-frontend-capabilities)
- [Usage Guide](#-usage-guide)
- [Security](#-security)

---

## ✨ V2 Features

* **1-Click Yield:** Streamlined UX for depositing USDC into the $100M+ Moonwell MetaMorpho Vault.
* **Earn-Per-Second Metric:** Real-time visibility into the exact micro-yield earned every second.
* **Automated Network Rewards:** Smart-contract enabled instant profit sharing for referrers.
* **Self-Sustaining Protocol:** Treasury collects a micro-fee solely from generated yield, keeping user principal 100% untouched.

---

## 💸 Profit Sharing & Penalty Logic

ZapApy utilizes a fair, automated incentive system designed to reward long-term stakers and network growth.

### The 76-Hour Loyalty Lock
To protect the vault from flash-farming, all deposits enter a 76-hour lock.
* **Early Withdrawal:** Triggers a 1% penalty on the total value. No profit is distributed.
* **Standard Withdrawal (Post-76 Hours):** 100% Free. No penalty.

### The Profit Split (Standard Withdrawal)
Upon a successful standard withdrawal, the Smart Contract calculates the **exact yield generated** and splits that profit:
* **85%** returned to the User (Yield + 100% of Principal).
* **10%** sent instantly to the user's Referrer.
* **5%** sent to the ZapApy Protocol Treasury (Performance Fee).

*Note: The Protocol and Referrers ONLY earn from generated profit. The user's principal is never taxed.*

---

## 💻 Smart Contract Details

**Network:** Base Mainnet  
**USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`  
**Moonwell mUSDC Vault:** `0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca`  

### Core Functions

<details>
<summary><code>zapIn(uint256 _amount, address _referrer)</code></summary>

* Transfers USDC and registers the `_referrer` permanently on the blockchain.
* Deposits USDC into the Morpho Vault, crediting user with Morpho Shares.
* Triggers the 76-hour lock timer.
</details>

<details>
<summary><code>zapOut()</code></summary>

* Checks lock status. If early, applies 1% penalty and exits.
* If post-76 hours, redeems 100% of shares back to USDC.
* Calculates absolute profit.
* Splits the profit between User, Referrer, and Protocol.
* Refunds the Principal to User.
</details>

---

## 🖥 Frontend Capabilities

The dashboard uses **Ethers.js (v5.7.2)** and introduces high-level mathematical displays.

**Per-Second Engine:**
Calculates the exact second-by-second growth using the active 9.1% APY:
```javascript
const growthPerSecond = ((currentVal * 0.091) / 31536000);
document.getElementById('perSecondDisplay').innerText = growthPerSecond.toFixed(8);
