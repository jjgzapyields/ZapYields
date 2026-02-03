# ⚡ ZapApy V2 Pro
### Institutional-Grade Yield & Referral Powerhouse on Base.

[![Network: Base](https://img.shields.io/badge/Network-Base-0052FF)](https://base.org)
[![Version](https://img.shields.io/badge/Version-v2.0_Pro-blue)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)

## 📖 Overview
**ZapApy V2 Pro** is a decentralized yield aggregator built on the **Base Network**. It provides a simplified "Zap" interface into **Moonwell MetaMorpho** vaults. The protocol features a high-performance, 5-tier referral system designed to maximize community growth and reward high-capital depositors.

---

## 🌩️ The Power Tiers (Multiplied Income)
Your referral commission rate is dynamically determined by your personal **Principal** deposit. The protocol automatically checks your tier status at the moment of a recruit's withdrawal to calculate your payout.

| Tier Name | Min. Deposit | Commission Rate |
| :--- | :--- | :--- |
| ⚡ **Lightning** | **$5,000+ USDC** | **80% of Profits** |
| 🌩️ **Thunder** | **$1,000+ USDC** | **50% of Profits** |
| 🌊 **Surge** | **$200+ USDC** | **30% of Profits** |
| 🔋 **Volt** | **$100+ USDC** | **20% of Profits** |
| ✨ **Spark** | **$50+ USDC** | **10% of Profits** |
| *Default* | *<$50 USDC* | *5% of Profits* |

---

## ⚙️ Core Protocol Mechanics

### 1. Zero-Loss Principal
User deposits are never taxed or deducted. All protocol fees and referral commissions are paid out **strictly from generated profit**. Users always retain 100% of their initial capital.

### 2. The 76-Hour Loyalty Lock
To ensure stable liquidity and prevent flash-loan manipulation:
* **Standard Exit:** After 76 hours, users can withdraw 100% principal + profits.
* **Early Exit:** Withdrawing before the 76-hour timer expires triggers a **1% Early-Exit Penalty** on the total balance.

### 3. Dynamic APY rendering
The platform renders APY in real-time, reflecting live market utilization and incentive rewards provided by Moonwell. Yield is compounded every block.

---

## 🖥️ Smart Contract Technicals
- **Network:** Base Mainnet (Chain ID: 8453)
- **USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Vault Provider:** Moonwell MetaMorpho (`mUSDC`)
- **Security:** Built with OpenZeppelin `Ownable`, `ReentrancyGuard`, and `SafeERC20`.

---

## 🚀 Deployment & Installation

### Prerequisites
- Node.js & npm
- MetaMask (connected to Base Network)
- A deployed instance of the `ZapApyV2Pro.sol` contract.

### Setup
1. Clone the repository:
   ```bash
   git clone [https://github.com/yourusername/zapapy-v2-pro.git](https://github.com/yourusername/zapapy-v2-pro.git)