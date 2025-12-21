import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '../client';
import { Abi } from '../abi';

export async function GET() {
  const contractAddress = process.env.NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS as `0x${string}`;

  if (!contractAddress) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  try {
    const counter = await publicClient.readContract({
      address: contractAddress,
      abi: Abi,
      functionName: 'raffleCounter',
    }) as bigint;

    const winners = [] as Array<{
      raffleId: number;
      winnerAddress: string;
      winnerIndex: number;
      month: string;
      commitmentHash: string;
      nftIds: string[];
    }>;

    for (let i = 1; i <= Number(counter); i++) {
      const [winnerAddress, winnerIndex, month, hasWinner] = await publicClient.readContract({
        address: contractAddress,
        abi: Abi,
        functionName: 'getWinnerByRaffleId',
        args: [BigInt(i)],
      }) as [string, bigint, string, boolean];

      if (hasWinner && winnerAddress !== '0x0000000000000000000000000000000000000000') {
        const [numberOfEntries, commitmentHash, raffleMonth, isActive, createdAt, selectedWinnerIndex, winnerAddrFromDetails, nftIds] = await publicClient.readContract({
          address: contractAddress,
          abi: Abi,
          functionName: 'getRaffleDetails',
          args: [BigInt(i)],
        }) as [bigint, bigint, string, boolean, bigint, bigint, `0x${string}`, string[]];

        const commitmentHashHex = '0x' + commitmentHash.toString(16).padStart(64, '0');

        winners.push({
          raffleId: i,
          winnerAddress,
          winnerIndex: Number(winnerIndex),
          month: raffleMonth,
          commitmentHash: commitmentHashHex,
          nftIds,
        });
      }
    }

    return NextResponse.json({ winners });
  } catch (error) {
    console.error('Error fetching past winners:', error);
    return NextResponse.json({ error: 'Failed to fetch past winners' }, { status: 500 });
  }
}