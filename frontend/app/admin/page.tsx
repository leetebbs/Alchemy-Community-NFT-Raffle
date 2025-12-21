"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from 'wagmi'
import { useState } from 'react'
import { startRaffle } from "../components/startRaffle";
import { StarIcon, TrophyIcon, ShieldIcon } from "lucide-react";

const contractABI = [
  {
    inputs: [],
    name: 'adminAddress',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

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
    
    const { data: contractAdminAddress, isLoading: adminLoading } = useReadContract({
        address: process.env.NEXT_PUBLIC_RAFFLE_CONTRACT_ADDRESS as `0x${string}`,
        abi: contractABI,
        functionName: 'adminAddress',
    });

    const adminAddress = contractAdminAddress?.toLowerCase();
    
    const [nftIds, setNftIds] = useState('');
    const [month, setMonth] = useState('');
    const [shuffle, setShuffle] = useState(true);
    const [loading, setLoading] = useState(false);
    const [entriesData, setEntriesData] = useState<EntriesResponse | null>(null);
    const [error, setError] = useState('');
    
    const [discordLookupAddress, setDiscordLookupAddress] = useState('');
    const [discordResult, setDiscordResult] = useState<{ discordName: string; ethAddress: string } | null>(null);
    const [discordLoading, setDiscordLoading] = useState(false);
    const [discordError, setDiscordError] = useState('');

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvMessage, setCsvMessage] = useState('');

    const [pastWinners, setPastWinners] = useState<Array<{ raffleId: number; winnerAddress: string; winnerIndex: number; month: string }>>([]);
    const [winnersLoading, setWinnersLoading] = useState(false);

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

    const lookupDiscordName = async () => {
        if (!discordLookupAddress.trim()) {
            setDiscordError('Please enter an Ethereum address');
            return;
        }

        setDiscordLoading(true);
        setDiscordError('');
        setDiscordResult(null);

        try {
            const response = await fetch(
                `/api/GetDiscordName?address=${encodeURIComponent(discordLookupAddress)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DISCORD_API_KEY}`,
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Address not found in the database');
                } else if (response.status === 401) {
                    throw new Error('Unauthorized');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setDiscordResult(data);
        } catch (err) {
            setDiscordError(err instanceof Error ? err.message : 'Failed to lookup Discord name');
        } finally {
            setDiscordLoading(false);
        }
    };

    const fetchPastWinners = async () => {
        setWinnersLoading(true);
        try {
            const response = await fetch('/api/FetchPastWinners');
            if (!response.ok) {
                throw new Error('Failed to fetch past winners');
            }
            const data = await response.json();
            setPastWinners(data.winners || []);
        } catch (err) {
            console.error('Error fetching past winners:', err);
            setPastWinners([]);
        } finally {
            setWinnersLoading(false);
        }
    };

    const handleCsvUpload = async () => {
        if (!csvFile) {
            setCsvMessage('Please select a CSV file');
            return;
        }

        setCsvUploading(true);
        setCsvMessage('');

        try {
            const formData = new FormData();
            formData.append('file', csvFile);

            const apiKey = process.env.NEXT_PUBLIC_DISCORD_API_KEY;
            const response = await fetch('/api/UploadCSV', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload CSV');
            }

            const data = await response.json();
            setCsvMessage(`CSV uploaded successfully: ${data.filename}`);
            setCsvFile(null);
            // Reset file input
            const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (err) {
            setCsvMessage(err instanceof Error ? err.message : 'Failed to upload CSV');
        } finally {
            setCsvUploading(false);
        }
    };

    const fetchLastWinnerDiscord = async () => {
        try {
            setDiscordLoading(true);
            setDiscordError('');
            setDiscordResult(null);

            // Fetch past winners
            const winnersResponse = await fetch('/api/FetchPastWinners');
            if (!winnersResponse.ok) {
                throw new Error('Failed to fetch winners');
            }

            const winnersData = await winnersResponse.json();
            const winners = winnersData.winners || [];

            if (winners.length === 0) {
                setDiscordError('No past winners found');
                return;
            }

            // Get the last winner
            const lastWinner = winners[winners.length - 1];

            // Look up their Discord name
            const response = await fetch(
                `/api/GetDiscordName?address=${encodeURIComponent(lastWinner.winnerAddress)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DISCORD_API_KEY}`,
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Address not found: ${lastWinner.winnerAddress}`);
                }
                throw new Error('Failed to lookup Discord name');
            }

            const discordData = await response.json();
            setDiscordResult(discordData);
            setDiscordLookupAddress(lastWinner.winnerAddress);
        } catch (err) {
            setDiscordError(err instanceof Error ? err.message : 'Failed to fetch last winner Discord name');
        } finally {
            setDiscordLoading(false);
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
                {adminLoading ? (
                    <div className="text-center">
                        <p className="text-lg text-blue-700">Loading admin verification...</p>
                    </div>
                ) : isConnected && address?.toLowerCase() === adminAddress ? (
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
                                        value={month ?? ''}
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
                                        value={nftIds ?? ''}
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

                        

                        {/* Discord Lookup Section */}
                        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-blue-200">
                            <h3 className="text-2xl font-bold text-blue-900 mb-6">Lookup Discord Name</h3>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-blue-700 mb-2">
                                    Ethereum Address
                                </label>
                                <input
                                    type="text"
                                    value={discordLookupAddress ?? ''}
                                    onChange={(e) => setDiscordLookupAddress(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 text-blue-900"
                                />
                            </div>

                            <div className="flex gap-4 mb-6">
                                <button
                                    onClick={lookupDiscordName}
                                    disabled={discordLoading}
                                    className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                                >
                                    {discordLoading ? 'Searching...' : 'Lookup Discord Name'}
                                </button>
                                <button
                                    onClick={fetchLastWinnerDiscord}
                                    disabled={discordLoading}
                                    className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                                >
                                    {discordLoading ? 'Loading...' : 'Last Winner'}
                                </button>
                            </div>

                            {discordError && (
                                <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-700 font-semibold mb-4">
                                    {discordError}
                                </div>
                            )}

                            {discordResult && (
                                <div className="p-4 bg-green-100 border-2 border-green-300 rounded-lg text-green-700">
                                    <p className="font-semibold mb-2">Found:</p>
                                    <p className="mb-1"><span className="font-semibold">Discord Name:</span> {discordResult.discordName}</p>
                                    <p className="text-sm font-mono break-all"><span className="font-semibold">Address:</span> {discordResult.ethAddress}</p>
                                </div>
                            )}
                        </div>

                        {/* CSV Upload Section */}
                        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-blue-200">
                            <h3 className="text-2xl font-bold text-blue-900 mb-6">Upload Discord Data CSV</h3>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-blue-700 mb-2">
                                    CSV File
                                </label>
                                <input
                                    id="csvFileInput"
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                    className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 text-blue-900"
                                />
                            </div>

                            <button
                                onClick={handleCsvUpload}
                                disabled={csvUploading || !csvFile}
                                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                            >
                                {csvUploading ? 'Uploading...' : 'Upload CSV'}
                            </button>

                            {csvMessage && (
                                <div className={`mt-4 p-4 rounded-lg font-semibold ${csvMessage.includes('success') || csvMessage.includes('uploaded') ? 'bg-green-100 border-2 border-green-300 text-green-700' : 'bg-red-100 border-2 border-red-300 text-red-700'}`}>
                                    {csvMessage}
                                </div>
                            )}
                        </div>

                        Past Winners Section
                        <div className="bg-white rounded-xl p-8 shadow-lg border-2 border-blue-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-blue-900">Past Winners</h3>
                                <button
                                    onClick={fetchPastWinners}
                                    disabled={winnersLoading}
                                    className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors text-sm"
                                >
                                    {winnersLoading ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>

                            {pastWinners.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-blue-200">
                                                <th className="text-left py-3 px-4 font-semibold text-blue-900">Raffle ID</th>
                                                <th className="text-left py-3 px-4 font-semibold text-blue-900">Month</th>
                                                <th className="text-left py-3 px-4 font-semibold text-blue-900">Winner Address</th>
                                                <th className="text-left py-3 px-4 font-semibold text-blue-900">Index</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pastWinners.map((winner) => (
                                                <tr key={winner.raffleId} className="border-b border-blue-100 hover:bg-blue-50">
                                                    <td className="py-3 px-4 text-blue-700 font-semibold">{winner.raffleId}</td>
                                                    <td className="py-3 px-4 text-blue-700">{winner.month}</td>
                                                    <td className="py-3 px-4 text-blue-600 font-mono text-xs break-all">{winner.winnerAddress}</td>
                                                    <td className="py-3 px-4 text-blue-700">{winner.winnerIndex}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-blue-600">
                                    {winnersLoading ? 'Loading winners...' : 'No past winners found. Click "Refresh" to load.'}
                                </div>
                            )}
                        </div>

                        
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