'use client'

import { StarIcon, TrophyIcon } from "lucide-react"
import { useState, useEffect } from "react"

interface Winner {
  raffleId: number;
  winnerAddress: string;
  winnerIndex: number;
  month: string;
}

export default function PastWinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPastWinners = async () => {
      try {
        const response = await fetch('/api/FetchPastWinners');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setWinners(data.winners || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch past winners');
      } finally {
        setLoading(false);
      }
    };

    fetchPastWinners();
  }, []);

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
              Celebrating Our{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                Past Winnners
              </span>
            </h1>
            <p className="text-lg text-blue-700 leading-relaxed text-pretty max-w-2xl mx-auto">
              See all the winners who have been selected in our monthly Alchemy University NFT raffles.
            </p>
          </div>
        </div>
      </section>

      {/* Winners Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-16">
        {loading ? (
          <div className="text-center">
            <p className="text-lg text-blue-700">Loading past winners...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 text-center">
            <p className="text-red-700 font-semibold">Error: {error}</p>
          </div>
        ) : winners.length === 0 ? (
          <div className="text-center">
            <p className="text-lg text-blue-700">No past winners yet.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 md:p-12 border-2 border-blue-200 glow">
            <div className="flex items-center gap-3 mb-6">
              <TrophyIcon className="w-8 h-8 text-blue-600" />
              <h3 className="text-2xl md:text-3xl font-bold text-blue-900">All Past Winners</h3>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {winners.map((winner, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <TrophyIcon className="w-6 h-6 text-blue-600" />
                    <p className="text-sm text-blue-600 font-semibold">Raffle #{winner.raffleId}</p>
                  </div>
                  <p className="text-sm text-blue-600 font-semibold mb-2">{winner.month}</p>
                  <p className="text-lg font-bold text-blue-900 mb-2">{`${winner.winnerAddress.slice(0, 6)}...${winner.winnerAddress.slice(-4)}`}</p>
                  <p className="text-sm text-blue-700">Winner Index: {winner.winnerIndex}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}