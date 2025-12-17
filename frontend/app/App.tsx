"use client";

import '@rainbow-me/rainbowkit/styles.css';
import {
    getDefaultConfig,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {sepolia} from 'wagmi/chains';
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import { useMemo } from 'react';

function App({children}:{children: React.ReactNode;}) {
    const config = useMemo(() => getDefaultConfig({
        appName: 'Alchemy Monthly NFT Raffle',
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string,
        chains: [sepolia],
        ssr: true, // If your dApp uses server side rendering (SSR)
    }), []);

    const queryClient = useMemo(() => new QueryClient(), []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
export default App;