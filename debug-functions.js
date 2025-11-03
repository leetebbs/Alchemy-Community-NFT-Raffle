// Clean JavaScript code for Chainlink Functions playground testing
// Use this code directly in the playground for fetchWinnerAddressSource

const nftIdsString = args[0];
const winnerIndex = parseInt(args[1]);

// Validate arguments
if (!nftIdsString || isNaN(winnerIndex)) {
  throw new Error('Invalid arguments');
}

const nftIds = nftIdsString.split(',').map(id => id.trim());

const apiResponse = await Functions.makeHttpRequest({
  url: 'https://alchemy-community-nft-raffle.vercel.app/api/FetchNumberOfEntries',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: { 
    nftIds: nftIds, 
    shuffle: true, 
    includeEntries: true 
  }
});

// Check for API errors
if (apiResponse.error) {
  throw new Error('API request failed: ' + apiResponse.error);
}

const { data } = apiResponse;

// Validate response structure
if (!data || !data.entries || !Array.isArray(data.entries)) {
  throw new Error('Invalid API response structure');
}

// Check bounds
if (winnerIndex >= data.entries.length) {
  throw new Error('Winner index out of bounds: ' + winnerIndex + ' >= ' + data.entries.length);
}

const winnerAddress = data.entries[winnerIndex];

// Validate winner address
if (!winnerAddress) {
  throw new Error('Winner address is null or undefined');
}

return Functions.encodeString(winnerAddress);