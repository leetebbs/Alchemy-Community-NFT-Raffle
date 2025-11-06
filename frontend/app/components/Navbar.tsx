"use client";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const [activeLink, setActiveLink] = useState('home');

  return (
    <>
      <nav className="bg-gradient-to-r from-blue-200 to-cyan-500 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={100}
                  height={100}
                />
              </div>
              <h1 className="text-white text-lg font-semibold tracking-wide hidden md:block">
                Community NFT Raffle
              </h1>
            </div>

            {/* Right side - Navigation Links */}
            <div className="flex items-center space-x-3">
              <Link 
                href="/"
                onClick={() => setActiveLink('home')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeLink === 'home'
                    ? 'bg-white text-blue-600'
                    : 'bg-white/10 text-white hover:bg-white/25 backdrop-blur-sm'
                }`}
              >
                Home
              </Link>
              <Link 
                href="/pastWinners"
                onClick={() => setActiveLink('pastWinners')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeLink === 'pastWinners'
                    ? 'bg-white text-blue-600'
                    : 'bg-white/10 text-white hover:bg-white/25 backdrop-blur-sm'
                }`}
              >
                Past Winners
              </Link>
                            <Link 
                href="/admin"
                onClick={() => setActiveLink('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeLink === 'admin'
                    ? 'bg-white text-blue-600'
                    : 'bg-white/10 text-white hover:bg-white/25 backdrop-blur-sm'
                }`}
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}