# ⚡ ZapYields

![License](https://img.shields.io/badge/License-MIT-green.svg)
![Network](https://img.shields.io/badge/Network-Base-blue.svg)
![Status](https://img.shields.io/badge/Status-Active-success.svg)

> **Zap in. Earn out.** > The first gamified yield aggregator on the Base Network.

## 📖 Overview

**ZapYields** is a decentralized yield aggregator built on **Base**. It allows users to "Zap" their **USDC** directly into a high-yield lending position powered by **Moonwell**, while participating in an on-chain, gamified referral ecosystem.

Unlike traditional referral systems, ZapYields **never touches your principal**. Commissions are paid strictly from the *yield generated*, ensuring your deposit remains 100% asset-backed.

---

## 🚀 Key Features

* **🛡️ 100% Asset-Backed:** All deposits are routed to Moonwell (mUSDC), ensuring institutional-grade security.
* **💸 Yield Streaming:** Interest accrues every block (approx. 2 seconds).
* **⚡ Zap Technology:** One-click deposit mechanism that bundles approval, minting, and staking.
* **🔒 Non-Custodial:** You maintain ownership of your funds. The protocol only manages the *profit share*.

---

## 🔋 The Energy Tier System

Referrers earn a continuous share of their downline's interest based on their own deposit level. Upgrade your tier to capture more value from your network.

| Tier Name | Required Deposit | Commission Rate (Share of Profit) |
| :--- | :--- | :--- |
| **⚡ Spark** | $50 USDC | **10%** |
| **⚡ Volt** | $100 USDC | **20%** |
| **⚡ Surge** | $200 USDC | **30%** |
| **⚡ Thunder** | $1,000 USDC | **50%** |
| **⚡ Lightning** | $5,000 USDC | **80%** |

---

## ⚙️ Fees & Limits

To ensure protocol sustainability and prevent abuse, the following fee structure is enforced by the smart contract:

1.  **Network Fee:** A flat **$2.00 USDC** fee is charged on every withdrawal to cover gas and automation costs.
2.  **Performance Fee:** The protocol takes a **10% cut** of the *profit only*. (If you make no profit, we take no percentage).
3.  **Anti-Whale Timer:** A **36-hour lockup** applies to new deposits.
    * *Standard Withdrawal:* After 36 hours (Standard fees apply).
    * *Emergency Withdrawal:* Before 36 hours (1% penalty on total principal).

---

## ⛓️ Contract Addresses (Base Mainnet)

| Contract | Address |
| :--- | :--- |
| **ZapYields Vault** | `0x...[PASTE_YOUR_CONTRACT_ADDRESS_HERE]...` |
| **USDC (Base)** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **Moonwell (mUSDC)** | `0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22` |

---

## ⚠️ Disclaimer

*This project is experimental software. While it relies on audited protocols (Moonwell/Aave), smart contracts carry inherent risk. Never deposit more than you can afford to lose. ZapYields provides access to DeFi yields but does not guarantee them.*
