import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'


// Fisher-Yates shuffle algorithm for randomizing array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]; // Create a copy to avoid mutating original
  console.log('Original array (first 5):', array.slice(0, 5));
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  console.log('Shuffled array (first 5):', shuffled.slice(0, 5));
  console.log('Arrays are different:', JSON.stringify(array.slice(0, 5)) !== JSON.stringify(shuffled.slice(0, 5)));
  return shuffled;
}

const apikey = process.env.ALCHEMY_API_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;

type OwnerCount = {
  address: string;
  nftCount: number;
  tokenIds: string[];
}

type ResponseData = {
  totalEntries: number;
  commitmentHash: string;
  entries?: string[];
  ownerCounts?: OwnerCount[];
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nftIds, includeEntries = false, month, shuffle = false } = body;

    // If month is provided, we could customize the NFT IDs based on the month
    // For now, we'll use the provided nftIds or default ones
    let eligibleNftIds = nftIds;
    
    if (!eligibleNftIds || !Array.isArray(eligibleNftIds) || eligibleNftIds.length === 0) {
      // Default NFTs if none provided
      eligibleNftIds = ['137', '138', '139'];
    }

    if (!apikey || !contractAddress) {
      return NextResponse.json({ 
        totalEntries: 0,
        commitmentHash: '',
        error: 'Server configuration error - missing API key or contract address' 
      }, { status: 500 });
    }

    try {
      const ownerCounts: OwnerCount[] = [];
      const allEntries: string[] = [];

      // Fetch owners for each NFT ID
      for (const nftId of eligibleNftIds) {
        const url = `https://polygon-mainnet.g.alchemy.com/nft/v3/${apikey}/getOwnersForNFT?contractAddress=${contractAddress}&tokenId=${nftId}`;
        const options = { method: 'GET' };
        
        const response = await fetch(url, options);
        console.log("response from nft owners fetch:", response);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.owners && data.owners.length > 0) {
          // Process owners for this NFT
          data.owners.forEach((owner: string) => {
            // Find existing owner or create new entry
            let existingOwner = ownerCounts.find(oc => oc.address === owner);
            
            if (existingOwner) {
              existingOwner.nftCount += 1;
              existingOwner.tokenIds.push(nftId);
            } else {
              ownerCounts.push({
                address: owner,
                nftCount: 1,
                tokenIds: [nftId]
              });
            }

            // Add entries for raffle (one entry per NFT owned)
            // Always add to allEntries for debugging/logging
            allEntries.push(owner);
            
            // Note: This will always populate allEntries regardless of includeEntries flag
          });

        }
      }

      
      // Calculate total entries
      const totalEntries = ownerCounts.reduce((sum, owner) => sum + owner.nftCount, 0);

      // Shuffle entries if requested
      const finalEntries = shuffle ? shuffleArray(allEntries) : allEntries;

      // Console log all entries for debugging
      console.log('All Entries (raffle entries):', finalEntries);
      console.log('Owner Counts:', ownerCounts);
      console.log('Total Entries:', totalEntries);
      console.log('Shuffled:', shuffle);

      // Create commitment hash (based only on sorted entries for consistent verification)
      const entriesForHash = shuffle ? [...allEntries].sort() : allEntries.sort();
      const entriesString = entriesForHash.join('');
      const commitmentHash = createHash('sha256').update(entriesString).digest('hex');

      const responseData: ResponseData = {
        totalEntries,
        commitmentHash,
        entries: finalEntries, // Always include entries (shuffled or not)
        ownerCounts: ownerCounts.sort((a, b) => b.nftCount - a.nftCount) // Sort by NFT count descending
      };

      // Legacy support: only include entries in response if specifically requested
      // if (includeEntries) {
      //   responseData.entries = allEntries;
      // }

      return NextResponse.json(responseData);

    } catch (fetchError) {
      console.error('Error fetching NFT data:', fetchError);
      return NextResponse.json({ 
        totalEntries: 0,
        commitmentHash: '',
        error: 'Failed to fetch NFT owner data from Alchemy API' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ 
      totalEntries: 0,
      commitmentHash: '',
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
