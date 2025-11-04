import { createPublicClient, createWalletClient, custom, http} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

declare global {
  interface Window {
    ethereum?: any;
  }
}
 
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
})
 
export const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum)
});

// JSON-RPC Account
export const getAccount = async () => {
  const addresses = await walletClient.getAddresses();
  return addresses[0];
}
