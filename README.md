# 🎮 Hybrid
 
> Unified Web3 multiplayer platform powered by **Hemi Network** (Sepolia Testnet), built for the **Hemi Arcade** competition. Fast-paced, high-stakes games with on-chain ELO ratings, chip pots, live real-time matchmaking, and zero clunky setup.

---

## 🕹️ Live Arenas

### ♟️ 1. Hemi Chess
- **Format**: 1v1 Ranked Strategy Duel (3m Blitz / 5m Rapid)
- **Features**: Real-time authoritative clock, move validation with `chess.js`, instant spectator mode, dynamic BGM, and on-chain ELO settlement via `HemiChessElo.sol`.

### 🃏 2. Hemi Crazy 8
- **Format**: 2–4 Player Multiplayer Card Game
- **Features**: Fast-paced card-slapping party with Skips, +2 Stacks, Reverses, and Wilds. Win and sweep the pot of `$CRAZY8` chips, settled through smart contract escrow.

### 🔴 3. Hemi Connect 4
- **Format**: 1v1 Gravity-Disc Strategy
- **Features**: 20-second blitz turns, solo practice against tactical `HemiBot` AI, custom private room invites, and dedicated on-chain ELO rating via `HemiConnect4Elo.sol`.

---

## 🚀 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons, Framer Motion
- **Web3**: Wagmi v2, Viem, Ethers v6, AppKit (Hemi Sepolia Chain ID: `743111`)
- **Real-Time Backend**: Node.js, Express, Socket.io (Authoritative multiplayer game engine with isolated namespaces: `/chess`, `/uno`, `/connect4`)
- **Storage & Database**: Supabase (PostgreSQL), Cloudflare R2 (Avatar storage)
- **Smart Contracts**: Solidity (ERC-20 token, Escrow pots, ELO rating registries)

---

## 🛠️ Quick Start

### 1. Prerequisites
- [Bun](https://bun.sh/) (or Node.js v20+)
- MetaMask or any Web3 wallet configured with [Hemi Sepolia Testnet](https://testnet.hemi.network)

### 2. Install Dependencies
```bash
bun install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase, Cloudflare R2, and smart contract configuration values.

### 4. Run Development Server
```bash
bun run dev
```
- **Next.js Web App**: `http://localhost:3000`
- **Socket.io Game Server**: `http://localhost:3001`

---

## 📜 Smart Contracts (Hemi Sepolia)

| Contract | Address |
| :--- | :--- |
| **Hemi Chess ELO** | `0xeE82E97e9B8bA9b189FcB7Dedb65Dc3717f41d79` |
| **Hemi Connect 4 ELO** | `0xfe6dc2c29b9f0e83c229a9a3deb1c89cde81afa3` |
| **$CRAZY8 Token** | `0x19B111602A60442CCbe947a58a5fd7CB0195324E` |
| **Crazy 8 Escrow Pot** | `0xbD42f75Fee8aD5Dd260DAbbC0520b5A0Efa1F060` |

---

## 📄 License
MIT
