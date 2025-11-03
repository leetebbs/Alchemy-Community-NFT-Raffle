import { createPublicClient, http } from 'viem'
import {  sepolia } from 'viem/chains'
 
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.ALCHEMY_RAFFLE_RPC_URL)
})