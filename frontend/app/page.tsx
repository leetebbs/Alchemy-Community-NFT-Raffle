'use client'

import { StarIcon, TrophyIcon } from "lucide-react"
import { Button } from "./components/ui/button"
import { useState, useEffect } from "react"
import { resolveEnsName } from "./utils/getEns"

export default function Home() {
  const [winnerAddress, setWinnerAddress] = useState<string | null>(null);
  const [winnerDisplayName, setWinnerDisplayName] = useState<string>("Loading...");
  const [month, setMonth] = useState<string>("November 2025");
  const [totalEntries, setTotalEntries] = useState<number>(15);
  const [announcedDate, setAnnouncedDate] = useState<string>("November 15, 2025");
  const [isActive, setIsActive] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWinner = async () => {
      try {
        const response = await fetch('/api/FetchWinnerAddress');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const addressToUse = data.winnerAddress;
        
        setWinnerAddress(addressToUse);
        if (data.month) setMonth(data.month);
        if (data.numberOfEntries !== undefined) setTotalEntries(data.numberOfEntries);
        if (data.createdAt) {
          const date = new Date(data.createdAt * 1000);
          setAnnouncedDate(date.toLocaleDateString());
        }
        if (data.isActive !== undefined) setIsActive(data.isActive);
        
        // Resolve ENS name if winner exists
        if (addressToUse) {
          const displayName = await resolveEnsName(addressToUse);
          // If no ENS name, slice the address, otherwise use the full ENS name
          const finalDisplayName = displayName === addressToUse 
            ? `${displayName.slice(0, 6)}...${displayName.slice(-4)}`
            : displayName;
          setWinnerDisplayName(finalDisplayName);
        } else {
          setWinnerDisplayName("No winner yet");
        }
      } catch (error) {
        console.error('Failed to fetch winner:', error);
        setWinnerDisplayName("No winner yet");
      } finally {
        setLoading(false);
      }
    };

    fetchWinner();
  }, []);

  // Placeholder data
  const latestWinner = {
    address: loading ? "Loading..." : winnerDisplayName,
    month: month,
    announcedDate: announcedDate,
    status: winnerAddress ? (!isActive ? "Complete" : "Winner Selected") : (!isActive ? "Ended" : "Active"),
    prize: "Limited Edition Alchemy University Mystery Swag Box"
  }

  const raffleStats = {
    totalEntries: totalEntries,
    userEntries: 5, // This might need to be dynamic based on user
    winProbability: totalEntries > 0 ? (1 / totalEntries * 100).toFixed(2) + "%" : "0%"
  }

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
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-blue-100 rounded-full">
                <p className="text-sm font-semibold text-blue-700">✨ {latestWinner.month} Raffle</p>
              </div>
              <h2 className="text-5xl md:text-6xl font-bold leading-tight text-blue-900 text-balance">
                Win Premium{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                  Community Call NFT Swag!
                </span>
              </h2>
              <p className="text-lg text-blue-700 leading-relaxed text-pretty">
                Collect the weekly Alchemy University community call NFT's and get the chance to win exclusive swag in our monthly raffle
                draws.
              </p>
            </div>
          </div>

          {/* Right Visual */}
          <div className="flex justify-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              {/* Animated NFT Card */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-2xl transform rotate-6 hover:rotate-3 transition-transform duration-300 float">
                <div className="p-8 h-full flex flex-col justify-between text-white rounded-2xl bg-gradient-to-br from-blue-500/90 to-blue-700/90">
                  <div>
                    <StarIcon className="w-12 h-12 mb-4" />
                    <p className="text-sm font-semibold opacity-90">Limited Edition</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold">Mystery Swag Box</p>
                    <p className="text-sm mt-2 opacity-75">Community Exclusive</p>
                  </div>
                  <div className="flex justify-between text-xs opacity-75">
                    <span>Alchemy Builders</span>
                    <span>2025</span>
                  </div>
                </div>
              </div>
              {/* Overlay decorative card */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300 to-blue-500 rounded-2xl shadow-xl transform -rotate-3 opacity-40"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Winner Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8 md:p-12 border-2 border-blue-200 glow">
          <div className="flex items-center gap-3 mb-6">
            <TrophyIcon className="w-8 h-8 text-blue-600" />
            <h3 className="text-2xl md:text-3xl font-bold text-blue-900">{latestWinner.month} Winner</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Winner Card */}
            <div className="md:col-span-2 bg-white rounded-xl p-8 shadow-lg border-2 border-blue-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-blue-600 font-semibold mb-2">🎉 CONGRATULATIONS</p>
                  <h4 className="text-3xl md:text-4xl font-bold text-blue-900">{latestWinner.address}</h4>
                </div>
                <div className="text-5xl">🏆</div>
              </div>
              <p className="text-lg text-blue-700 font-semibold mb-4">Has Won the Exclusive Community Call Swag</p>
              <div className="space-y-3 text-blue-600">
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Prize:</span> {latestWinner.prize}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Announced:</span> {latestWinner.announcedDate}
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    {latestWinner.status}
                  </span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
                <p className="text-sm text-blue-600 font-semibold mb-2">Total Entries</p>
                <p className="text-4xl font-bold text-blue-900">{raffleStats.totalEntries.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
