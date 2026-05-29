'use client';

import { useState, useRef } from 'react';
import QRCode from 'react-qr-code';
import Scanner from '@/components/Scanner';
import DownloadActions from '@/components/DownloadActions';
import type { PublicMemberProfile } from '@hau/contracts';

export default function DualEntrySearchPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleEmailSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    performSearch('email', email.trim());
  };

  const handleScan = (decodedText: string) => {
    setShowScanner(false);
    if (!decodedText.trim()) return;
    performSearch('barcode', decodedText.trim());
  };

  const performSearch = async (type: 'email' | 'barcode', value: string) => {
    setLoading(true);
    setError(null);
    setProfile(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'An unexpected error occurred.');
      }

      const data = await res.json();
      setProfile(data as PublicMemberProfile);
      setEmail(''); // clear email input on success
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f1a] via-[#12122a] to-[#0a0a18] px-4 py-12">
      {/* Background glow blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-red-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-red-500 to-yellow-400 p-0.5 shadow-lg shadow-blue-500/30">
              <div className="w-full h-full bg-[#0f0f1a] rounded-[14px] flex items-center justify-center">
                <span className="text-2xl font-black bg-gradient-to-r from-blue-400 via-red-400 to-yellow-300 bg-clip-text text-transparent">G</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Public Registry</h1>
          <p className="text-white/50 text-sm mt-1">Verify GDG HAU Membership</p>
        </div>

        {/* State 1: Search Form (if no profile loaded) */}
        {!profile && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Camera Scanner Button */}
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl py-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 border border-white/20 mb-6 group"
            >
              <svg className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Scan Barcode via Camera</span>
            </button>

            <div className="relative flex py-4 items-center mb-2">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/30 text-xs font-medium uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <form onSubmit={handleEmailSearch} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="block text-xs font-semibold text-white/60 uppercase tracking-widest">
                  Registered Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 text-white font-semibold rounded-xl py-3 transition-all duration-200 shadow-lg"
              >
                {loading ? 'Searching...' : 'Search Registry'}
              </button>
            </form>
          </div>
        )}

        {/* State 2: Profile Display */}
        {profile && (
          <div className="animate-in fade-in zoom-in duration-300">
            {/* ID Card */}
            <div ref={cardRef} className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/60 bg-gradient-to-br from-[#1a1a3e] via-[#1e2060] to-[#0d0d2e] p-7">
              {/* Google color accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]" />
              
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-red-500 to-yellow-400 p-0.5">
                  <div className="w-full h-full bg-[#1a1a3e] rounded-md flex items-center justify-center">
                    <span className="text-xs font-black text-white">G</span>
                  </div>
                </div>
                <div>
                  <p className="text-white text-xs font-bold leading-none">GDG on Campus</p>
                  <p className="text-white/50 text-[10px] leading-none mt-0.5">Holy Angel University</p>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-white text-2xl font-bold tracking-tight">{profile.fullName}</h2>
                <p className="text-blue-400 font-mono mt-1 font-semibold">{profile.hauId}</p>
                <p className="text-white/50 text-sm mt-1">{profile.program}</p>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-6">
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest font-semibold mb-1">Status</p>
                  <span className="inline-flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Verified Member
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl">
                  <QRCode 
                    value={profile.hauId} 
                    size={64} 
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="L"
                  />
                </div>
              </div>
            </div>

            <DownloadActions cardRef={cardRef} hauId={profile.hauId} />

            <button
              onClick={() => setProfile(null)}
              className="mt-4 w-full text-white/50 hover:text-white text-sm font-medium transition-colors"
            >
              ← Back to Search
            </button>
          </div>
        )}
      </div>

      {showScanner && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </main>
  );
}
