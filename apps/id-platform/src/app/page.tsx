'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import Scanner from '@/components/Scanner';
import type { PublicMemberProfile } from '@hau/contracts';

export default function DualEntrySearchPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [showScanner, setShowScanner] = useState(false);

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
    <main className="min-h-screen relative flex flex-col items-center justify-center bg-[#030305] overflow-hidden font-mono px-4 py-12 pt-32">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full px-8 py-4 flex items-center justify-between z-50 border-b border-cyan-900/30 bg-[#030305]/70 backdrop-blur-md">
        {/* Left Side: Logo & Text */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#050508] border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.1)] rounded-sm">
            <span className="text-lg font-black bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] bg-clip-text text-transparent">G</span>
          </div>
          <div>
            <h2 className="text-cyan-500 font-bold text-sm tracking-wide">Google Developer Group</h2>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-0.5">Holy Angel University</p>
          </div>
        </div>

        {/* Right Side: Navigation & Switch */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-gray-300 hover:text-cyan-400 text-xs font-semibold tracking-wider transition-colors">About</a>
          <a href="#" className="text-gray-300 hover:text-cyan-400 text-xs font-semibold tracking-wider transition-colors">FAQs</a>
          <a href="#" className="text-gray-300 hover:text-cyan-400 text-xs font-semibold tracking-wider transition-colors">Contact</a>
          <a href="#" className="text-gray-300 hover:text-cyan-400 text-xs font-semibold tracking-wider transition-colors">Coming Soon</a>

          {/* Toggle Switch */}
          <div className="w-10 h-5 bg-cyan-900/40 rounded-full border border-cyan-700/50 relative cursor-pointer flex items-center">
            <div className="w-3.5 h-3.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] absolute right-1 transition-all"></div>
          </div>
        </nav>
      </header>

      {/* Background Grid & Scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[size:100%_4px]" />

      {/* Concentric Circles Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-cyan-900/20 rounded-full pointer-events-none animate-[spin_120s_linear_infinite]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-cyan-900/10 rounded-full pointer-events-none animate-[spin_180s_linear_infinite_reverse]" />

      {/* Corner Ambient Lights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] bg-[#4285F4]/10 rounded-full blur-[60px] animate-pulse duration-1000" />
        <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-[#EA4335]/10 rounded-full blur-[69px] animate-pulse duration-1000 delay-100" />
        <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] bg-[#FBBC05]/10 rounded-full blur-[60px] animate-pulse duration-1000 delay-200" />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] bg-[#34A853]/10 rounded-full blur-[60px] animate-pulse duration-1000 delay-300" />
      </div>

      <div className="relative w-full max-w-3xl z-10 flex flex-col items-center">
        {/* Header Text */}
        {!profile && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-[#ff00ff] animate-pulse"></div>
              <span className="text-cyan-500 text-xs tracking-[0.2em] uppercase font-bold">SYSTEM_ACCESS_GRANTED</span>
              <div className="w-2 h-2 bg-cyan-500 animate-pulse"></div>
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-white tracking-widest uppercase mb-6 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              GDGHAU ID PLATFORM
            </h1>

            <p className="text-cyan-50/70 text-sm md:text-base text-center max-w-2xl leading-relaxed mb-12 tracking-wide font-sans">
              GDG HAU helps student developers grow through real projects,
              events, and mentorship connecting classroom learning to
              industry practice.
            </p>

            {/* Search Bar Container */}
            <div className="flex items-center w-full max-w-2xl gap-4 group">
              {/* Left Circle Arrow */}
              <div className="hidden sm:flex w-8 h-8 rounded-full border border-cyan-800/50 group-hover:border-cyan-500 items-center justify-center text-cyan-600 group-hover:text-cyan-400 transition-colors bg-black/20 backdrop-blur-sm shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                <span className="text-xs">&lt;</span>
              </div>

              <form onSubmit={handleEmailSearch} className="flex-grow flex items-center bg-[#0a0a0f]/80 backdrop-blur-md border border-cyan-900/50 focus-within:border-cyan-400/80 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.2)] rounded-sm relative h-14 transition-all duration-300">
                {/* Search Icon */}
                <div className="pl-4 pr-2 text-cyan-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email to find your Digital ID"
                  className="flex-grow bg-transparent px-2 h-full text-cyan-50 placeholder-cyan-800/60 focus:outline-none text-sm font-mono"
                />

                <div className="flex items-stretch h-full">
                  {/* Scanner Button (Icon only) */}
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-4 text-cyan-500 hover:text-cyan-300 hover:bg-cyan-900/50 transition-all border-l border-cyan-900/50 h-full flex items-center justify-center active:bg-cyan-800"
                    title="Scan Barcode"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="square" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="square" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="bg-cyan-500/90 text-black font-bold uppercase text-xs tracking-wider px-8 hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] disabled:bg-cyan-950 disabled:text-cyan-800 transition-all duration-300 h-full flex items-center justify-center relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10">{loading ? '...' : 'SEARCH ID'}</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                  </button>
                </div>
              </form>

              {/* Right Circle Arrow */}
              <div className="hidden sm:flex w-8 h-8 rounded-full border border-cyan-800/50 group-hover:border-cyan-500 items-center justify-center text-cyan-600 group-hover:text-cyan-400 transition-colors bg-black/20 backdrop-blur-sm shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                <span className="text-xs">&gt;</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 border border-[#ff0044]/40 bg-[#ff0044]/10 backdrop-blur-md px-4 py-2 animate-in slide-in-from-top-2">
                <p className="text-[#ff0044] text-[10px] uppercase tracking-[0.1em] animate-pulse">ERR: {error}</p>
              </div>
            )}
          </div>
        )}

        {/* State 2: Profile Display */}
        {profile && (
          <div className="w-full max-w-sm border border-cyan-500/40 bg-[#0a0a0f]/80 backdrop-blur-xl p-8 relative animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-500 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#ff00ff]" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#ff00ff]" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500" />

            <div className="flex justify-between items-start mb-8 border-b border-cyan-900/50 pb-4">
              <div>
                <p className="text-cyan-700 text-[9px] uppercase tracking-[0.3em]">Clearance</p>
                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mt-1 animate-pulse">Granted</p>
              </div>
              <div className="text-right">
                <p className="text-cyan-700 text-[9px] uppercase tracking-[0.3em]">Node</p>
                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mt-1">GDG.HAU</p>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-white text-xl font-black uppercase tracking-[0.1em] mb-2">{profile.fullName}</h2>
              <p className="text-[#ff00ff] text-xs tracking-[0.2em] drop-shadow-[0_0_5px_rgba(255,0,255,0.4)]">{profile.hauId}</p>
              <p className="text-cyan-600 text-[10px] mt-2 uppercase tracking-widest">{profile.program}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="bg-white/90 p-1.5 rounded-sm hover:scale-105 transition-transform duration-300">
                <QRCode
                  value={profile.hauId}
                  size={64}
                  bgColor="transparent"
                  fgColor="#000000"
                  level="L"
                />
              </div>
            </div>

            <button
              onClick={() => setProfile(null)}
              className="mt-8 w-full border border-cyan-900/80 text-cyan-500 hover:text-black hover:bg-cyan-500 text-[10px] uppercase tracking-[0.3em] py-3 transition-all duration-300 font-bold"
            >
              TERM.CLOSE
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
