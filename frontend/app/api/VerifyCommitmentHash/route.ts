import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const apikey = process.env.ALCHEMY_API_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;

type VerificationRequest = {
  nftIds?: string[];
  entries?: string[];
  commitmentHash: string;
}

type VerificationResponse = {
  isValid: boolean;
  calculatedHash: string;
  providedHash: string;
  entriesCount: number;
  nftIds?: string[];
  method: 'nft-fetch' | 'provided-entries';
  message: string;
  entriesPreview?: string[];
}

// Function to get entries from NFTs (same logic as FetchNumberOfEntries)
async function getEntriesFromNFTs(nftIds: string[]) {
  if (!apikey || !contractAddress) {
    throw new Error('Server configuration error - missing API key or contract address');
  }

  const allEntries: string[] = [];

  // Fetch owners for each NFT ID
  for (const nftId of nftIds) {
    const url = `https://polygon-mainnet.g.alchemy.com/nft/v3/${apikey}/getOwnersForNFT?contractAddress=${contractAddress}&tokenId=${nftId}`;
    const options = { method: 'GET' };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for NFT ID: ${nftId}`);
    }
    
    const data = await response.json();
    
    if (data.owners && data.owners.length > 0) {
      // Add each owner to entries (one entry per NFT owned)
      data.owners.forEach((owner: string) => {
        allEntries.push(owner);
      });
    }
  }

  return allEntries;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerificationRequest = await request.json();
    const { nftIds, entries: providedEntries, commitmentHash } = body;

    if (!commitmentHash) {
      return NextResponse.json({ 
        error: 'commitmentHash is required' 
      }, { status: 400 });
    }

    let entries: string[] = [];
    let method: 'nft-fetch' | 'provided-entries';

    // Method 1: Fetch entries from NFT IDs (preferred)
    if (nftIds && Array.isArray(nftIds) && nftIds.length > 0) {
      try {
        entries = await getEntriesFromNFTs(nftIds);
        method = 'nft-fetch';
        console.log('Fetched entries from NFTs for verification');
      } catch (error) {
        return NextResponse.json({ 
          error: 'Failed to fetch NFT data: ' + (error as Error).message 
        }, { status: 500 });
      }
    }
    // Method 2: Use provided entries (fallback)
    else if (providedEntries && Array.isArray(providedEntries) && providedEntries.length > 0) {
      entries = providedEntries;
      method = 'provided-entries';
      console.log('Using provided entries for verification');
    } else {
      return NextResponse.json({ 
        error: 'Either nftIds or entries array is required' 
      }, { status: 400 });
    }

    if (entries.length === 0) {
      return NextResponse.json({ 
        error: 'No entries found to verify against' 
      }, { status: 404 });
    }

    // Calculate hash using the same method as FetchNumberOfEntries (no timestamp)
    const sortedEntries = [...entries].sort();
    const entriesString = sortedEntries.join('');
    const calculatedHash = createHash('sha256').update(entriesString).digest('hex');

    const isValid = calculatedHash === commitmentHash;

    console.log('Hash Verification:', {
      method,
      nftIds,
      entriesCount: entries.length,
      calculatedHash,
      providedHash: commitmentHash,
      isValid
    });

    const responseData: VerificationResponse = {
      isValid,
      calculatedHash,
      providedHash: commitmentHash,
      entriesCount: entries.length,
      nftIds,
      method,
      entriesPreview: entries.slice(0, 5),
      message: isValid 
        ? `✅ Hash verification PASSED - Data integrity confirmed for ${entries.length} entries` 
        : `❌ Hash verification FAILED - Data may have changed or timestamp mismatch`
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error verifying hash:', error);
    return NextResponse.json({ 
      error: 'Internal server error during hash verification: ' + (error as Error).message 
    }, { status: 500 });
  }
}