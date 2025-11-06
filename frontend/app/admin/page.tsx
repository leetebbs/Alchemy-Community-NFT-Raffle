"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from 'wagmi'
import { useState } from 'react'
import { startRaffle } from "../components/startRaffle";
import { StarIcon, TrophyIcon, ShieldIcon } from "lucide-react";

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
        <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 overflow-hidden">
            {/* Animated Stars Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-10 left-10 star">
                    <StarIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="absolute top-20 right-20 star" style={{ animationDelay: "1s" }}>
                    <StarIcon className="w-4 h-4 text-blue-300" />
                </div>
                <div className="absolute top-40 left-1/4 star" style={{ animationDelay: "2s" }}>
                    <StarIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div className="absolute top-1/3 right-1/4 star" style={{ animationDelay: "0.5s" }}>
                    <StarIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div className="absolute bottom-1/3 left-20 star" style={{ animationDelay: "1.5s" }}>
                    <StarIcon className="w-5 h-5 text-blue-300" />
                </div>
                <div className="absolute bottom-20 right-1/3 star" style={{ animationDelay: "2.5s" }}>
                    <StarIcon className="w-4 h-4 text-blue-500" />
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 py-20 md:py-32">
                <div className="text-center space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-6xl font-bold leading-tight text-blue-900 text-balance">
                            Manage the{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                                Alchemy Raffle
                            </span>
                        </h1>
                        <p className="text-lg text-blue-700 leading-relaxed text-pretty max-w-2xl mx-auto">
                            Admin controls for fetching entries, starting raffles, and managing the community prize draws.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="relative z-10 max-w-6xl mx-auto px-4 py-16">
                {isConnected && address?.toLowerCase() === adminAddress ? (
                    <div className="space-y-8">
                        {/* Welcome Message */}
                        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 md:p-12 border-2 border-green-200 glow">
                            <div className="flex items-center gap-3 mb-6">
                                <TrophyIcon className="w-8 h-8 text-green-600" />
                                <h3 className="text-2xl md:text-3xl font-bold text-green-900">Welcome, Admin!</h3>
                            </div>
                            <p className="text-lg text-green-700">You have full access to manage the raffle system.</p>
                        </div>

                        {/* Fetch Entries Section */}
                        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-blue-200">
                            <h3 className="text-2xl font-bold text-blue-900 mb-6">Fetch Raffle Entries</h3>
                            
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-blue-700 mb-2">
                                        Month
                                    </label>
                                    <input
                                        type="text"
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        placeholder="e.g., November 2025"
                                        className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 text-blue-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-blue-700 mb-2">
                                        NFT IDs (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={nftIds}
                                        onChange={(e) => setNftIds(e.target.value)}
                                        placeholder="136, 137, 138, 139"
                                        className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 text-blue-900"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mb-6">
                                <button
                                    onClick={fetchEntries}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                                >
                                    {loading ? 'Fetching...' : 'Fetch Entries'}
                                </button>

                                {entriesData && (
                                    <button
                                        onClick={handleStartRaffle}
                                        className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-semibold transition-colors"
                                    >
                                        Start Raffle
                                    </button>
                                )}
                            </div>

                            {error && (
                                <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-700 font-semibold">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Results Section */}
                        {entriesData && (
                            <div className="grid md:grid-cols-3 gap-8">
                                {/* Summary */}
                                <div className="md:col-span-1 bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
                                    <h4 className="text-lg font-bold text-blue-900 mb-4">Summary</h4>
                                    <div className="space-y-3">
                                        <p className="text-blue-700"><span className="font-semibold">Total Entries:</span> {entriesData.totalEntries}</p>
                                        <p className="text-blue-700"><span className="font-semibold">Unique Owners:</span> {entriesData.ownerCounts.length}</p>
                                        <p className="text-blue-700 text-sm"><span className="font-semibold">Commitment Hash:</span></p>
                                        <p className="font-mono text-xs break-all text-blue-600">{entriesData.commitmentHash}</p>
                                    </div>
                                </div>

                                {/* All Entries */}
                                <div className="md:col-span-1 bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
                                    <h4 className="text-lg font-bold text-blue-900 mb-4">All Entries ({entriesData.entries.length})</h4>
                                    <div className="max-h-60 overflow-y-auto space-y-1">
                                        {entriesData.entries.map((entry, index) => (
                                            <div key={index} className="text-sm font-mono py-1 border-b border-blue-100 text-blue-700">
                                                {index}: {entry}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Owner Counts */}
                                <div className="md:col-span-1 bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
                                    <h4 className="text-lg font-bold text-blue-900 mb-4">Owner Counts</h4>
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {entriesData.ownerCounts.map((owner, index) => (
                                            <div key={index} className="text-sm py-1 border-b border-blue-100 text-blue-700">
                                                <span className="font-mono">{owner.address.slice(0, 8)}...{owner.address.slice(-6)}</span>
                                                <span className="ml-2 text-blue-600">({owner.nftCount} NFTs)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-8 md:p-12 border-2 border-red-200 glow text-center max-w-2xl mx-auto">
                        <div className="flex justify-center mb-6">
                            <ShieldIcon className="w-16 h-16 text-red-600" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-red-900 mb-4">Access Denied</h2>
                        <p className="text-lg text-red-700 mb-4">You are not authorized to view this admin page.</p>
                        {!isConnected && (
                            <p className="text-red-600 font-semibold">Please connect your wallet first.</p>
                        )}
                        {isConnected && address?.toLowerCase() !== adminAddress && (
                            <p className="text-red-600 font-semibold">Your wallet address does not match the admin address.</p>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}