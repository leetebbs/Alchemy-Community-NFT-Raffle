import { createPublicClient, http, getAddress } from 'viem'
import { mainnet } from 'viem/chains'
 
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

export async function resolveEnsName(address: string): Promise<string> {
  try {
    // Ensure address is properly checksummed
    const checksummedAddress = getAddress(address)
    
    const ensName = await publicClient.getEnsName({
      address: checksummedAddress,
    })
    console.log('Resolved ENS name for', checksummedAddress, ':', ensName)
    
    // Return ENS name if it exists, otherwise return the address
    return ensName || address
  } catch (error) {
    console.error('Error resolving ENS name:', error)
    return address
  }
}

// Helper function to verify ENS name
export async function verifyEnsName(ensName: string): Promise<string | null> {
  try {
    const address = await publicClient.getEnsAddress({
      name: ensName,
    })
    console.log('ENS name', ensName, 'resolves to:', address)
    return address || null
  } catch (error) {
    console.error('Error verifying ENS name:', error)
    return null
  }
}