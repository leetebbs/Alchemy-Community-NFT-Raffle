Alchemy Community NFT Raffle
================================

Alchemy Community NFT Raffle is a full-stack dApp that lets Alchemy University communities run transparent monthly giveaways. A Chainlink Functions + VRF powered smart contract proves fairness on-chain, while a Next.js dashboard handles admin tooling, entry audits, and winner announcements.

Contents
--------
- [How It Works](#how-it-works)
- [Project Layout](#project-layout)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Smart Contract Suite (`contracts/`)](#smart-contract-suite-contracts)
- [Frontend (`frontend/`)](#frontend-frontend)
- [Chainlink Integrations](#chainlink-integrations)
- [API Utilities](#api-utilities)
- [Verification & Auditing](#verification--auditing)
- [Troubleshooting & Notes](#troubleshooting--notes)
- [Acknowledgements](#acknowledgements)

How It Works
------------
- Admin launches a raffle for a specific month with the qualifying NFT token IDs.
- Chainlink Functions fetches live owner data from the Alchemy NFT API, returning total entries plus a commitment hash of all participants.
- Chainlink VRF v2.5 draws a provably fair winner index from those entries.
- Chainlink Functions is called again to resolve the shuffled winner wallet and store it on-chain.
- The Next.js site exposes public pages for the active raffle, past winners, and an admin-only control panel.

Project Layout
--------------
- `contracts/` — Foundry project with the `AlchemyRaffle` contract, deployment script, and Chainlink integrations.
- `frontend/` — Next.js 16 app (App Router) with RainbowKit, Wagmi, and server routes for Alchemy/Chainlink interop.

Prerequisites
-------------
- Node.js 20+ and npm
- Foundry toolchain (`forge`, `cast`, `anvil`) — install via <https://book.getfoundry.sh/getting-started/installation>
- An Alchemy (or compatible) RPC endpoint and NFT API key for your target network
- Chainlink Functions and VRF subscriptions funded on your target network
- WalletConnect Cloud project ID for RainbowKit (WalletConnect v2)

Quick Start
-----------
1. **Clone the repo**
	 ```bash
	 git clone https://github.com/leetebbs/Alchemy-Community-NFT-Raffle.git
	 cd Alchemy-Community-NFT-Raffle
	 ```
2. **Configure environments**
	 - Copy `contracts/.env.example` to `contracts/.env` and fill in Chainlink + RPC details.
	 - Create `frontend/.env.local` with the variables listed in [Frontend](#frontend-frontend).
3. **Build contracts & launch frontend**
	 ```bash
	 cd contracts
	 forge install
	 forge build

	 cd ../frontend
	 npm install
	 npm run dev
	 ```
4. Visit `http://localhost:3000` to interact with the UI.

Smart Contract Suite (`contracts/`)
----------------------------------
- **Source:** `src/AlchemyRaffle.sol` extends `FunctionsClient` and `VRFConsumerBaseV2Plus` to coordinate entry retrieval and random selection.
- **Key features**
	- Tracks raffle rounds, entry counts, commitment hashes, and winner metadata.
	- Calls Chainlink Functions twice: first to fetch entries + commitment, second to resolve the winner address.
	- Uses Chainlink VRF v2.5 for randomness; winner index is stored before requesting the second Functions call.
- **Deploy**
	- Populate `contracts/.env`.
	- Run `forge script script/DeployAlchemyRaffle.s.sol:DeployAlchemyRaffle --rpc-url <network> --broadcast` (see `contracts/README.md` for network aliases and post-deploy checklist).
	- Authorize the deployed address on both the Chainlink Functions and VRF subscriptions.

Frontend (`frontend/`)
----------------------
- **Stack:** Next.js 16 (App Router), Tailwind CSS (v4), RainbowKit, Wagmi + viem, React Query.
- **Pages**
	- `/` — Public landing page with live winner/raffle info pulled from the contract via API routes.
	- `/admin` — Wallet-gated controls to fetch eligible entries and trigger `startRaffle` from the connected admin wallet.
	- `/pastWinners` — Historical winners hydrated from the contract `getWinnerByRaffleId` view.
- **Environment variables** (create `frontend/.env.local`)
	```bash
	NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS=0xYourDeployedContract
	NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
	ALCHEMY_RAFFLE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
	ALCHEMY_API_KEY=your_polygon_nft_api_key
	CONTRACT_ADDRESS=0x8728F6f66ceAb2f092BBde42DaB380b97b349d19_alchemy_comunity_call_nft_contract_address
	```
	Optional extras: `RAFFLE_CONTRACT_NETWORK` if you expose multiple environments.
- **Development**
	- `npm run dev` — start local Next.js server.
	- `npm run build` / `npm start` — production build + serve.
- **Wallet flow** — `App.tsx` wires RainbowKit + Wagmi (Sepolia chain). The admin action `startRaffle` encodes a transaction with viem’s `encodeFunctionData` and sends it through the connected wallet.

Chainlink Integrations
----------------------
- **Functions**
	- Inline JavaScript requests live entry data from `https://alchemy-community-nft-raffle.vercel.app/api/FetchNumberOfEntries`.
	- Response must include total entry count and a commitment hash to seal the participant set.
	- Secondary request returns the shuffled winner address for the previously drawn index.
- **VRF v2.5**
	- Uses network-specific `keyHash`, `coordinator`, and subscription IDs configured in the deployment script.
	- `fulfillRandomWords` stores a single random word, derives the winner index, and dispatches the follow-up Functions call.

API Utilities
-------------
- `app/api/FetchNumberOfEntries` — Server action that hits the Polygon NFT API, aggregates ownership counts, shuffles entries (optional), and mirrors the commitment logic used on-chain.
- `app/api/FetchWinnerAddress` — Reads the latest raffle struct from the contract and formats winner metadata for the landing page.
- `app/api/FetchPastWinners` — Iterates raffles via viem to build the public winners list.
- `app/api/VerifyCommitmentHash` — Recomputes commitment hashes from NFT data or provided entry arrays for transparency/audits.
- `app/api/GetDiscordName` — Server route that looks up Discord names from the community CSV file by Ethereum address. Protected by API key in Authorization header.

Discord Name Lookup
-------------------
The raffle system includes a Discord name lookup feature for admins to identify community members by their Ethereum address.

**CSV Data Source**
- Location: `frontend/public/data/Alchemy-Community-Call-Nov-26-2025_2025-11-26T19_50_06.csv`
- Contains: Discord display names, Discord user IDs, and Ethereum addresses submitted by community members during registration
- Used by: Admin dashboard to quickly find Discord identities for winners and participants

**API Endpoint: `GET /api/GetDiscordName`**
- **Query Parameters:** `address` (Ethereum address to look up)
- **Authentication:** Bearer token in `Authorization` header
- **Response:** 
  ```json
  {
    "discordName": "username",
    "ethAddress": "0x..."
  }
  ```
- **Error codes:**
  - `400` - Missing address parameter
  - `401` - Unauthorized (invalid API key)
  - `404` - Address not found in CSV
  - `500` - Server error

**Environment Variables**
```bash
NEXT_PUBLIC_DISCORD_API_KEY=your_secret_key  # Used by frontend to authenticate requests
DISCORD_API_KEY=your_secret_key              # Server-side validation (must match above)
```

**Admin Page Integration**
- The admin dashboard includes a "Lookup Discord Name" section
- Enter an Ethereum address to retrieve the associated Discord handle
- Results display both the Discord name and verified Ethereum address
- Requests are secured with API key authentication

Verification & Auditing
-----------------------
- **Commitment hash proofs** — Compare the hash emitted during `startRaffle` with `VerifyCommitmentHash` responses to ensure the entry list was unchanged.
- **Admin safeguards** — The admin page double-checks wallet ownership before exposing controls.

Troubleshooting & Notes
-----------------------
- Ensure the NFT collection lives on the same network as the Alchemy NFT API you query (defaults to Polygon mainnet)..
- Winner resolution is asynchronous; expect ~3 minutes between raffle start and final on-chain winner data depending on oracle fulfilment.

Acknowledgements
----------------
- Built with the Alchemy University community in mind.
- Chainlink Functions & VRF teams for oracle infrastructure.
- RainbowKit, Wagmi, and viem for wallet & chain tooling.
