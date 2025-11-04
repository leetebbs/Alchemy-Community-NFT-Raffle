"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { startRaffle } from "../components/startRaffle";

type EntriesResponse = {
    totalEntries: number;
    commitmentHash: string;
    entries: string[];
    ownerCounts: Array<{
        address: string;
        nftCount: number;
        tokenIds: string[];
    }>;
}

export default function AdminPage() {
    const { address, isConnected } = useAccount();
    const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase();
    
    const [nftIds, setNftIds] = useState('');
    const [month, setMonth] = useState('');
    const [shuffle, setShuffle] = useState(true);
    const [loading, setLoading] = useState(false);
    const [entriesData, setEntriesData] = useState<EntriesResponse | null>(null);
    const [error, setError] = useState('');

    const handleStartRaffle = () => {
        // Call the imported startRaffle function
        startRaffle(nftIds.split(',').map(id => id.trim()), month);
    }

    const fetchEntries = async () => {
        if (!nftIds.trim()) {
            setError('Please enter NFT IDs');
            return;
        }

        setLoading(true);
        setError('');
        setEntriesData(null);

        try {
            const nftIdArray = nftIds.split(',').map(id => id.trim()).filter(id => id);
            
            const response = await fetch('/api/FetchNumberOfEntries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nftIds: nftIdArray,
                    shuffle,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: EntriesResponse = await response.json();
            setEntriesData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch entries');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col items-center min-h-screen p-5">
            <h1 className="text-3xl font-bold mb-8">Admin Page</h1>
            
            <div className="mb-8">
                <ConnectButton />
            </div>

            {isConnected && address?.toLowerCase() === adminAddress ? (
                <div className="w-full max-w-4xl space-y-6">
                    <div className="p-6 bg-green-100 border border-green-300 rounded-lg">
                        <h2 className="text-xl font-semibold text-green-800 mb-2">✅ Welcome, Admin!</h2>
                        <p className="text-green-700">You have admin access to the raffle system.</p>
                    </div>

                    {/* Fetch Entries Section */}
                    <div className="p-6 border border-gray-300 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4">Fetch Raffle Entries</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Month
                                </label>
                                <input
                                    type="text"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    placeholder="e.g., November 2025"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    NFT IDs (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={nftIds}
                                    onChange={(e) => setNftIds(e.target.value)}
                                    placeholder="136, 137, 138, 139"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
{/* 
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="shuffle"
                                    checked={shuffle}
                                    onChange={(e) => setShuffle(e.target.checked)}
                                    className="rounded"
                                />
                                <label htmlFor="shuffle" className="text-sm font-medium text-gray-700">
                                    Shuffle entries
                                </label>
                            </div> */}

                            <button
                                onClick={fetchEntries}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Fetching...' : 'Fetch Entries'}
                            </button>

                            {entriesData && (
                                <button
                                    onClick={handleStartRaffle}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                                >
                                    Start Raffle
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                                {error}
                            </div>
                        )}

                        {entriesData && (
                            <div className="mt-6 space-y-4">
                                <div className="p-4 bg-gray-10 rounded-lg">
                                    <h4 className="font-semibold mb-2">Summary</h4>
                                    <p><strong>Total Entries:</strong> {entriesData.totalEntries}</p>
                                    <p><strong>Commitment Hash (Hex):</strong> <span className="font-mono text-sm break-all">{entriesData.commitmentHash}</span></p>
                                    <p><strong>Commitment Hash (Decimal):</strong> <span className="font-mono text-sm break-all">{BigInt('0x' + entriesData.commitmentHash).toString()}</span></p>
                                    <p><strong>Unique Owners:</strong> {entriesData.ownerCounts.length}</p>
                                </div>

                                <div className="p-4 bg-gray-10 rounded-lg">
                                    <h4 className="font-semibold mb-2">All Entries ({entriesData.entries.length})</h4>
                                    <div className="max-h-40 overflow-y-auto">
                                        {entriesData.entries.map((entry, index) => (
                                            <div key={index} className="text-sm font-mono py-1 border-b border-gray-200">
                                                {index}: {entry}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-10 rounded-lg">
                                    <h4 className="font-semibold mb-2">Owner Counts</h4>
                                    <div className="max-h-40 overflow-y-auto">
                                        {entriesData.ownerCounts.map((owner, index) => (
                                            <div key={index} className="text-sm py-1 border-b border-gray-200">
                                                <span className="font-mono">{owner.address}</span>
                                                <span className="ml-2 text-gray-600">({owner.nftCount} NFTs: {owner.tokenIds.join(', ')})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-8 bg-red-100 border border-red-300 rounded-lg max-w-lg w-full text-center">
                    <h2 className="text-xl font-semibold text-red-800 mb-2">❌ Access Denied</h2>
                    <p className="text-red-700 mb-2">You are not authorized to view this page.</p>
                    {!isConnected && (
                        <p className="text-red-600">Please connect your wallet first.</p>
                    )}
                    {isConnected && address?.toLowerCase() !== adminAddress && (
                        <p className="text-red-600">Your wallet address does not match the admin address.</p>
                    )}
                </div>
            )}
        </div>  
    );
}