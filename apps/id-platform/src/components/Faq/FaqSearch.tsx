'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface FaqSearchProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function FaqSearch({ searchQuery, setSearchQuery }: FaqSearchProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative w-full max-w-2xl mx-auto mb-12 transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
      <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
      
      <div className={`relative flex items-center bg-[#030305]/80 backdrop-blur-md border ${isFocused ? 'border-blue-500/50 shadow-[0_0_20px_rgba(66,133,244,0.3)]' : 'border-white/10'} rounded-2xl overflow-hidden transition-all duration-300`}>
        <div className="pl-5 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search for questions..."
          className="w-full bg-transparent border-none text-white px-4 py-4 md:py-5 focus:outline-none focus:ring-0 placeholder-gray-500 font-mono text-sm md:text-base"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="pr-5 text-gray-500 hover:text-gray-300 focus:outline-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}