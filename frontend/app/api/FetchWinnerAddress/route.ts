import { NextRequest, NextResponse } from 'next/server'
import { publicClient } from '../client'
import { Abi } from '../abi'
 
export async function GET(request: NextRequest) {
    const raffleContractAddress = process.env.RAFFLE_CONTRACT_ADDRESS as `0x${string}`;

    if (!raffleContractAddress) {
        throw new Error('Raffle contract address is not defined in environment variables.');
    }

    // First get the raffle counter
    const raffleCounter = await publicClient.readContract({
        address: raffleContractAddress,
        abi: Abi,
        functionName: 'raffleCounter',
    }) as bigint;

    if (raffleCounter === BigInt(0)) {
        return NextResponse.json({ winnerAddress: null, message: 'No raffles have been created yet' });
    }

    // Get the latest raffle data (use raffleCounter as the id)
    const data = await publicClient.readContract({
        address: raffleContractAddress,
        abi: Abi,
        functionName: 'raffles',
        args: [raffleCounter],
    }); 

    const [numberOfEntries, commitmentHash, month, isActive, createdAt, selectedWinnerIndex, winnerAddress] = data as [bigint, bigint, string, boolean, bigint, bigint, `0x${string}`];

    if (winnerAddress === '0x0000000000000000000000000000000000000000') {
        return NextResponse.json({ winnerAddress: null, message: 'No winner yet' });
    }

    console.log("Winner Address:", winnerAddress);

    return NextResponse.json({ winnerAddress, month, numberOfEntries: Number(numberOfEntries), createdAt: Number(createdAt), isActive });
}