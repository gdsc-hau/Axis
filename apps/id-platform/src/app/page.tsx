'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import Scanner from '@/components/Scanner';
import type { PublicMemberProfile } from '@hau/contracts';

export default function DualEntrySearchPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const fullTitle = "GDGHAU ID PLATFORM";
  const [displayedTitle, setDisplayedTitle] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedTitle(fullTitle.slice(0, i + 1));
      i++;
      if (i >= fullTitle.length) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

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
    <main className="min-h-screen relative flex flex-col items-center justify-center bg-[#030305] overflow-hidden px-4 py-12 pt-32 text-cyan-50">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full px-8 py-4 flex items-center justify-between z-50 border-b border-cyan-900/30 bg-[#030305]/70 backdrop-blur-md">
        {/* Left Side: Logo & Text */}
        <div className="flex items-center gap-4">
          {/* Custom GDG Angle Brackets Logo */}
          <div className="flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 28L4 20L12 12" stroke="#4285F4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M28 28L36 20L28 12" stroke="#EA4335" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 32L12 24L20 16" stroke="#FBBC05" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 24L28 16L20 8" stroke="#34A853" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg tracking-wide">Google Developer Group</h2>
            <p className="text-blue-400 text-xs mt-0.5">Holy Angel University</p>
          </div>
        </div>

        {/* Right Side: Navigation & Switch */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-gray-300 hover:text-blue-400 text-lg transition-colors">About</a>
          <a href="#" className="text-gray-300 hover:text-blue-400 text-lg transition-colors">FAQs</a>
          <a href="#" className="text-gray-300 hover:text-blue-400 text-lg transition-colors">Contact</a>
          <a href="#" className="text-gray-300 hover:text-blue-400 text-lg transition-colors">Coming Soon</a>

          {/* Toggle Switch */}
          <div className="w-12 h-6 bg-yellow-400/20 rounded-full border border-yellow-400/50 relative cursor-pointer flex items-center">
            <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)] absolute left-1 transition-all"></div>
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

      <div className="relative w-full max-w-4xl z-10 flex flex-col items-center">
        {/* Header Text */}
        {!profile && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center">

            <h1 className="text-6xl md:text-8xl font-black text-white tracking-wider mb-6 text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] font-cynatar">
              {displayedTitle}
              <span className="text-blue-500 animate-pulse">|</span>
            </h1>

            <p className="text-cyan-50/70 text-xl md:text-2xl text-center max-w-2xl leading-relaxed mb-12 tracking-wide font-sans">
              GDG HAU helps student developers grow through real projects,
              events, and mentorship connecting classroom learning to
              industry practice.
            </p>

            {/* Search Bar Container */}
            <div className="flex items-center w-full max-w-3xl gap-6 group relative">
              {/* Left Decoration */}
              <div className="hidden sm:flex absolute -left-20 w-14 h-14 rounded-full border border-cyan-800/50 items-center justify-center bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 28L4 20L12 12" stroke="#00C4FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M28 28L36 20L28 12" stroke="#00C4FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="hidden sm:block absolute -left-6 w-6 border-t border-dashed border-cyan-800/50"></div>

              <form onSubmit={handleEmailSearch} className="flex-grow flex items-center bg-white border border-cyan-900/50 focus-within:shadow-[0_0_20px_rgba(66,133,244,0.3)] rounded-lg relative h-16 transition-all duration-300 overflow-hidden">
                {/* Search Icon */}
                <div className="pl-6 pr-3 text-gray-400 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email to find your Digital ID"
                  className="flex-grow bg-transparent px-2 h-full text-gray-800 placeholder-gray-400 focus:outline-none text-xl"
                />

                <div className="flex items-stretch h-full p-2">
                  {/* Scanner Button (Icon only) */}
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-4 text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all border-r border-gray-200 h-full flex items-center justify-center"
                    title="Scan Barcode"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="square" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="square" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="bg-blue-500 text-white font-bold text-lg px-8 hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 transition-all duration-300 h-full flex items-center justify-center rounded-md ml-2"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    {loading ? '...' : 'Search ID'}
                  </button>
                </div>
              </form>

              {/* Right Decoration */}
              <div className="hidden sm:block absolute -right-6 w-6 border-t border-dashed border-cyan-800/50"></div>
              <div className="hidden sm:flex absolute -right-20 w-14 h-14 rounded-full border border-cyan-800/50 items-center justify-center bg-white shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 28L4 20L12 12" stroke="#00C4FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M28 28L36 20L28 12" stroke="#00C4FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {error && (
              <div className="mt-4 border border-[#ff0044]/40 bg-[#ff0044]/10 backdrop-blur-md px-4 py-2 animate-in slide-in-from-top-2">
                <p className="text-[#ff0044] text-lg uppercase tracking-[0.1em] animate-pulse">ERR: {error}</p>
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
                <p className="text-cyan-700 text-sm uppercase tracking-[0.3em]">Clearance</p>
                <p className="text-cyan-400 text-lg font-bold uppercase tracking-widest mt-1 animate-pulse">Granted</p>
              </div>
              <div className="text-right">
                <p className="text-cyan-700 text-sm uppercase tracking-[0.3em]">Node</p>
                <p className="text-cyan-400 text-lg font-bold uppercase tracking-widest mt-1">GDG.HAU</p>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-white text-3xl font-black uppercase tracking-[0.1em] mb-2">{profile.fullName}</h2>
              <p className="text-[#ff00ff] text-xl tracking-[0.2em] drop-shadow-[0_0_5px_rgba(255,0,255,0.4)]">{profile.hauId}</p>
              <p className="text-cyan-600 text-lg mt-2 uppercase tracking-widest">{profile.program}</p>
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
              className="mt-8 w-full border border-cyan-900/80 text-cyan-500 hover:text-black hover:bg-cyan-500 text-lg uppercase tracking-[0.3em] py-3 transition-all duration-300 font-bold"
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
