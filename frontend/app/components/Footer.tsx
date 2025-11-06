import { StarIcon } from "lucide-react";

export default function Footer() {
    return (
        <main className="min-h-fit bg-gradient-to-b from-blue-50 via-white to-blue-50 overflow-hidden relative">
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

            <footer className="relative z-10 border-t border-blue-100 bg-white/50 backdrop-blur-sm mt-20">
                <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-blue-700">
                    <p>© 2025 Alchemy University Community NFT Raffle. All rights reserved.</p>
                    <p className="mt-2 text-blue-600">Powered by blockchain technology · Transparent & Fair</p>
                </div>
            </footer>
        </main>
    );
}