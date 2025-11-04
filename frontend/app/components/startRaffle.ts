import { walletClient, getAccount } from '../../lib/config'
import { publicClient } from '../api/client'
import { Abi } from '../api/abi'
import { encodeFunctionData } from 'viem'

export async function startRaffle(
    nftIds: string[],
    month: string
) {
    console.log("Starting raffle for month:", month);
    console.log("NFT IDs included in this raffle:", nftIds);

    try {
        const account = await getAccount();
        if (!account) {
            throw new Error("No wallet connected. Please connect your wallet.");
        }
        // Encode the function call
        const data = encodeFunctionData({
            abi: Abi,
            functionName: 'startRaffle',
            args: [nftIds, month]
        });

        // Send the transaction directly without simulation
        const hash = await walletClient.sendTransaction({
            account,
            to: process.env.NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS as `0x${string}`,
            data,
            gas: BigInt(1000000)
        });

        console.log("Transaction sent:", hash);

        alert(`Raffle for ${month} started with ${nftIds.length} NFT entries! Transaction hash: ${hash}`);
    } catch (error) {
        console.error("Error starting raffle:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to start raffle. Error: ${errorMessage}`);
    }
}