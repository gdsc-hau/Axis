'use client';

import { useState, useEffect } from 'react';
import Scanner from '@/components/Scanner';
import GdgIdCard from '@/components/GdgIdCard';
import Navbar from '@/components/Navbar';
import type { PublicMemberProfile } from '@hau/contracts';
import { motion, AnimatePresence } from 'framer-motion';

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
      setEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center bg-[#030305] overflow-hidden px-4 py-8 md:py-12 pt-28 md:pt-32 text-cyan-50 font-sans selection:bg-cyan-500 selection:text-black">

      {/* Custom Keyframe Styles injected directly for portability */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

        @keyframes geminiPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.35; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.65; }
        }
        @keyframes rotateRainbow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        
        /* * LAVA LAMP ANIMATION ENGINE
         * Simulates fluid thermal buoyancies: rising, stretching, flattening out, and falling back down.
         */
        @keyframes lavaLeftSlow {
          0% { transform: translateY(80vh) scale(1, 1.2); opacity: 0.2; }
          30% { transform: translateY(40vh) scale(1.1, 0.9); opacity: 0.35; }
          50% { transform: translateY(-10vh) scale(1.3, 0.8); opacity: 0.25; }
          75% { transform: translateY(35vh) scale(0.9, 1.1); opacity: 0.35; }
          100% { transform: translateY(80vh) scale(1, 1.2); opacity: 0.2; }
        }

        @keyframes lavaLeftFast {
          0% { transform: translateY(-20vh) scale(1.2, 0.8); opacity: 0.25; }
          40% { transform: translateY(30vh) scale(0.9, 1.15); opacity: 0.3; }
          70% { transform: translateY(75vh) scale(1.1, 0.9); opacity: 0.15; }
          90% { transform: translateY(20vh) scale(1, 1.2); opacity: 0.35; }
          100% { transform: translateY(-20vh) scale(1.2, 0.8); opacity: 0.25; }
        }

        @keyframes lavaRightSlow {
          0% { transform: translateY(75vh) scale(1.1, 0.9); opacity: 0.15; }
          35% { transform: translateY(15vh) scale(0.95, 1.2); opacity: 0.25; }
          60% { transform: translateY(-15vh) scale(1.25, 0.85); opacity: 0.2; }
          80% { transform: translateY(45vh) scale(1, 1.1); opacity: 0.3; }
          100% { transform: translateY(75vh) scale(1.1, 0.9); opacity: 0.15; }
        }

        @keyframes lavaRightFast {
          0% { transform: translateY(-15vh) scale(1.3, 0.8); opacity: 0.2; }
          25% { transform: translateY(25vh) scale(0.9, 1.1); opacity: 0.3; }
          55% { transform: translateY(80vh) scale(1.15, 0.95); opacity: 0.15; }
          85% { transform: translateY(30vh) scale(1, 1.2); opacity: 0.25; }
          100% { transform: translateY(-15vh) scale(1.3, 0.8); opacity: 0.2; }
        }

        .gemini-glow {
          background: radial-gradient(circle, rgba(66, 133, 244, 0.45) 0%, rgba(155, 81, 224, 0.2) 45%, rgba(0, 0, 0, 0) 70%);
          filter: blur(40px);
          animation: geminiPulse 6s ease-in-out infinite;
        }
        .gemini-animated-wrapper {
          background: rgba(255, 255, 255, 0.08);
          padding: 1px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .gemini-animated-wrapper:focus-within {
          padding: 1.5px;
          background: linear-gradient(90deg, #4285F4, #9B51E0, #EA4335, #FBBC05, #34A853, #4285F4);
          background-size: 200% auto;
          animation: rotateRainbow 3s linear infinite;
          box-shadow: 0 0 30px rgba(66, 133, 244, 0.25);
        }
        .minecraft-font {
          font-family: 'VT323', monospace;
          letter-spacing: 0.02em;
          font-weight: bold;
        }

        /* Fluid class mappings utilizing staggered duration baselines */
        .lava-blue { animation: lavaLeftSlow 28s ease-in-out infinite; }
        .lava-red { animation: lavaLeftFast 22s ease-in-out infinite; }
        .lava-yellow { animation: lavaRightSlow 32s ease-in-out infinite; }
        .lava-green { animation: lavaRightFast 25s ease-in-out infinite; }

        /* Pure High-Density Glowing Radials specifically balanced for fluid layering output */
        .glow-blue { background: radial-gradient(circle, rgba(66, 133, 244, 0.4) 0%, rgba(66, 133, 244, 0.1) 40%, rgba(0,0,0,0) 70%); }
        .glow-red { background: radial-gradient(circle, rgba(234, 67, 53, 0.35) 0%, rgba(234, 67, 53, 0.08) 40%, rgba(0,0,0,0) 70%); }
        .glow-yellow { background: radial-gradient(circle, rgba(251, 188, 5, 0.28) 0%, rgba(251, 188, 5, 0.06) 40%, rgba(0,0,0,0) 70%); }
        .glow-green { background: radial-gradient(circle, rgba(52, 168, 83, 0.32) 0%, rgba(52, 168, 83, 0.08) 40%, rgba(0,0,0,0) 70%); }
      `}} />

      {/* HEADER */}
      <Navbar />

      {/* TECH BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] opacity-70 z-0" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(66,133,244,0.02)_2px,transparent_2px)] bg-[size:100%_6px] opacity-40 z-0" />

      {/* Retro Concentric Schematic Radar Circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[700px] sm:h-[700px] border border-white/5 rounded-full pointer-events-none flex items-center justify-center z-0">
        <div className="w-[260px] h-[260px] sm:w-[500px] sm:h-[500px] border border-dashed border-white/5 rounded-full animate-[spin_160s_linear_infinite]" />
        <div className="absolute w-[180px] h-[180px] sm:w-[300px] sm:h-[300px] border border-white/5 rounded-full" />
      </div>

      {/* LAVA LAMP CANVAS: Anchored via column viewports to simulate fluid bubbles moving up and down */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden grid grid-cols-2 opacity-80">

        {/* LEFT COLUMN BUOYANCIES (Blue and Red) */}
        <div className="relative h-full w-full">
          <div className="absolute left-[-10rem] top-[-10rem] w-[35rem] sm:w-[50rem] h-[35rem] sm:h-[50rem] rounded-full blur-[70px] sm:blur-[100px] glow-blue lava-blue" />
          <div className="absolute left-[5rem] top-[-5rem] w-[30rem] sm:w-[45rem] h-[30rem] sm:h-[45rem] rounded-full blur-[70px] sm:blur-[100px] glow-red lava-red" />
        </div>

        {/* RIGHT COLUMN BUOYANCIES (Yellow and Green) */}
        <div className="relative h-full w-full">
          <div className="absolute right-[-10rem] top-[-5rem] w-[35rem] sm:w-[48rem] h-[35rem] sm:h-[48rem] rounded-full blur-[70px] sm:blur-[100px] glow-yellow lava-yellow" />
          <div className="absolute right-[5rem] top-[-10rem] w-[32rem] sm:w-[46rem] h-[32rem] sm:h-[46rem] rounded-full blur-[70px] sm:blur-[100px] glow-green lava-green" />
        </div>

      </div>

      {/* MAIN CONTAINER */}
      <div className="relative w-full max-w-4xl z-10 flex flex-col items-center">

        {/* STATE 1: Search Landing */}
        {!profile && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* RESPONSE FIX: Tweaked size, tracking, and forced singular line layout on mobile */}
            <div className="flex items-center justify-center gap-2 mb-4 font-mono text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.3em] text-gray-500 uppercase whitespace-nowrap select-none">
              <span>[ system.ready ]</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
              <span>Google_Developers_Group // 01</span>
            </div>

            {/* MINECRAFT HEADER WITH MULTI-COLOR LETTER SPANS */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl minecraft-font mb-6 text-center select-none max-w-full px-2 sm:whitespace-nowrap">
              {displayedTitle.split("").map((char, index) => {
                let colorClass = "text-white"; // Default remaining text color

                if (index === 0) colorClass = "text-[#FF5555]";      // G - Minecraft Light Red
                else if (index === 1) colorClass = "text-[#55FF55]"; // D - Minecraft Lime Green
                else if (index === 2) colorClass = "text-[#FFFF55]"; // G - Minecraft Yellow
                else if (index >= 3 && index <= 5) colorClass = "text-[#5555FF]"; // HAU - Minecraft Light Blue

                return (
                  <span key={index} className={colorClass}>
                    {char}
                  </span>
                );
              })}
              <span className="text-blue-500 animate-[pulse_0.8s_infinite] font-light">|</span>
            </h1>

            <p className="text-gray-400 text-xs sm:text-sm md:text-base text-center max-w-2xl leading-relaxed mb-10 sm:mb-14 tracking-wide font-normal px-4">
              GDG HAU helps student developers grow through real projects,
              events, and mentorship connecting classroom learning to
              industry practice.
            </p>

            {/* CHANGED: Opened max-width from 3xl to 4xl to allow layout expansion on desktop monitors */}
            <div className="flex items-center w-full max-w-4xl gap-4 md:gap-6 relative px-1 sm:px-16 justify-center mx-auto">

              {/* Left Mechanical Dial Indicator */}
              <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full border border-white/10 items-center justify-center bg-[#07070a] shadow-[0_0_15px_rgba(0,0,0,0.5)] group hover:border-blue-500/50 transition-colors duration-300">
                <span className="text-[11px] font-mono font-bold text-gray-500 group-hover:text-blue-400 transition-colors">&lt;&gt;</span>
              </div>

              {/* Central Search Wrapper Area with Background Glow and Border Engine */}
              {/* CHANGED: Boosted custom limit threshold from 550px to 680px and applied flex centering styles */}
              <div className="flex-grow relative group w-full max-w-[680px] mx-auto">

                {/* 1. Ambient Background Glow Behind Input */}
                <div className="gemini-glow absolute left-1/2 top-1/2 w-[140%] sm:w-[160%] h-[200px] sm:h-[300px] pointer-events-none z-0 rounded-full" />

                {/* 2. Rainbow Border Container */}
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                  className="gemini-animated-wrapper w-full rounded-2xl relative z-10 shadow-[0_10px_40px_rgba(0,0,0,0.7)]"
                >

                  {/* 3. Sleek Dark Search Form Box */}
                  <form
                    onSubmit={handleEmailSearch}
                    className="flex items-center bg-[#131314] rounded-[15px] h-14 overflow-hidden w-full"
                  >
                    {/* Glass Icon */}
                    <div className="pl-4 sm:pl-5 pr-1 sm:pr-2 text-gray-400 shrink-0">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email to find Digital ID"
                      className="flex-grow bg-transparent px-2 h-full text-gray-100 placeholder-gray-500 focus:outline-none text-sm sm:text-base font-medium font-mono min-w-0"
                    />

                    <div className="flex items-center h-full p-1.5 gap-1 sm:gap-2 shrink-0">
                      {/* Scanner Button (Camera Icon) */}
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="p-2 sm:p-2.5 text-gray-400 hover:text-blue-400 hover:bg-white/5 rounded-xl transition-all h-full flex items-center justify-center shrink-0"
                        title="Scan Barcode"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                      </button>

                      {/* Submit Action Button */}
                      <button
                        type="submit"
                        disabled={loading || !email}
                        className="bg-[#1e1e1f] hover:bg-[#282829] text-white border border-white/10 font-mono text-xs uppercase tracking-widest px-3 sm:px-5 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-transparent transition-all duration-200 h-full flex items-center justify-center rounded-xl font-bold gap-2 shrink-0 active:scale-95"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin shrink-0" />
                        ) : (
                          <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        )}
                        <span className="hidden sm:inline">{loading ? 'SEARCHING' : 'Search ID'}</span>
                      </button>
                    </div>
                  </form>

                </motion.div>
              </div>

              {/* Right Mechanical Dial Indicator */}
              <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-full border border-white/10 items-center justify-center bg-[#07070a] shadow-[0_0_15px_rgba(0,0,0,0.5)] group hover:border-blue-500/50 transition-colors duration-300">
                <span className="text-[11px] font-mono font-bold text-gray-500 group-hover:text-blue-400 transition-colors">&lt;&gt;</span>
              </div>

            </div>

            {error && (
              <div className="mt-6 border border-red-500/30 bg-red-950/20 backdrop-blur-md px-5 py-2.5 rounded-lg max-w-sm font-mono text-xs tracking-wider text-center mx-4">
                <p className="text-red-400 uppercase">⚠️ System Error: {error}</p>
              </div>
            )}
          </div>
        )}

        {/* STATE 2: Profile Card */}
        {profile && (
          <GdgIdCard profile={profile} onEject={() => setProfile(null)} />
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