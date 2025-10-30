# NFT Raffle API

A fair and transparent NFT-based raffle system with commitment hash verification.

## Features

- ✅ **Fair Entry System**: One entry per NFT owned
- ✅ **Transparent Verification**: Commitment hash for data integrity
- ✅ **Manual Winner Selection**: Choose winner by index
- ✅ **Entry Shuffling**: Randomize entry order
- ✅ **Caching System**: Efficient storage for multiple selections

## API Endpoints

### 1. FetchNumberOfEntries

Get all raffle entries for specified NFT IDs.

**Endpoint:** `POST /api/FetchNumberOfEntries`

**Parameters:**
- `nftIds` (string[]): Array of NFT token IDs
- `shuffle` (boolean, optional): Randomize entry order (default: false)
- `includeEntries` (boolean, optional): Include entries in response (default: false)

**Example:**
```bash
curl -X POST http://localhost:3000/api/FetchNumberOfEntries \
  -H "Content-Type: application/json" \
  -d '{
    "nftIds": ["136", "137", "138"],
    "shuffle": true
  }'
```

**Response:**
```json
{
  "totalEntries": 21,
  "commitmentHash": "abc123def456...",
  "entries": ["0x84C83307...", "0x19A7fe32..."],
  "ownerCounts": [
    {
      "address": "0x84C83307...",
      "nftCount": 3,
      "tokenIds": ["136", "137", "138"]
    }
  ]
}
```

### 2. VerifyCommitmentHash

Verify the integrity of raffle data using commitment hash.

**Endpoint:** `POST /api/VerifyCommitmentHash`

**Parameters:**
- `nftIds` (string[]): Array of NFT token IDs to verify against
- `commitmentHash` (string): Hash to verify

**Example:**
```bash
curl -X POST http://localhost:3000/api/VerifyCommitmentHash \
  -H "Content-Type: application/json" \
  -d '{
    "nftIds": ["136", "137", "138"],
    "commitmentHash": "abc123def456..."
  }'
```

**Response:**
```json
{
  "isValid": true,
  "calculatedHash": "abc123def456...",
  "providedHash": "abc123def456...",
  "entriesCount": 21,
  "nftIds": ["136", "137", "138"],
  "method": "nft-fetch",
  "message": "✅ Hash verification PASSED - Data integrity confirmed for 21 entries"
}
```

## Environment Variables

```env
ALCHEMY_API_KEY=your_alchemy_api_key
CONTRACT_ADDRESS=your_nft_contract_address
```

## Development

```bash
npm install
npm run dev
```
