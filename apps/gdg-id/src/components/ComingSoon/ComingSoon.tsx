"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Hammer, Wrench } from "lucide-react";

export default function ComingSoon() {
  return (
    <main className="min-h-screen relative flex flex-col items-center bg-[#030305] overflow-x-hidden text-cyan-50 font-sans selection:bg-cyan-500 selection:text-black">
      <Navbar />

      {/* TECH BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] opacity-70 z-0" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(rgba(66,133,244,0.02)_2px,transparent_2px)] bg-[size:100%_6px] opacity-40 z-0" />

      {/* LAVA LAMP CANVAS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden grid grid-cols-2 opacity-60">
        <div className="relative h-full w-full">
          <div className="absolute left-[-10rem] top-[-10rem] w-[35rem] sm:w-[50rem] h-[35rem] sm:h-[50rem] rounded-full blur-[70px] sm:blur-[100px] glow-blue lava-blue" />
          <div className="absolute left-[5rem] top-[-5rem] w-[30rem] sm:w-[45rem] h-[30rem] sm:h-[45rem] rounded-full blur-[70px] sm:blur-[100px] glow-red lava-red" />
        </div>
        <div className="relative h-full w-full">
          <div className="absolute right-[-10rem] top-[-5rem] w-[35rem] sm:w-[48rem] h-[35rem] sm:h-[48rem] rounded-full blur-[70px] sm:blur-[100px] glow-yellow lava-yellow" />
          <div className="absolute right-[5rem] top-[-10rem] w-[32rem] sm:w-[46rem] h-[32rem] sm:h-[46rem] rounded-full blur-[70px] sm:blur-[100px] glow-green lava-green" />
        </div>
      </div>

      <div className="relative w-full z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 pt-28 md:pt-32 pb-20 text-center flex-grow max-w-4xl mx-auto">
        {/* Animated Gyro Image with Tools */}
        <div className="relative mb-12 animate-in fade-in zoom-in duration-1000">
          <div className="absolute inset-0 bg-[#FBBC05]/20 blur-[80px] rounded-full" />
          <Image
            src="/assets/images/gyro/hiding_curtain.png"
            alt="Gyro Sneak Peek"
            width={280}
            height={280}
            className="relative z-10 object-contain drop-shadow-[0_0_30px_rgba(251,188,5,0.4)] animate-[bounce_4s_infinite]"
          />
          {/* Floating Tools Micro-Interactions */}
          <div className="absolute top-10 -left-12 text-[#4285F4] animate-[spin_6s_linear_infinite] opacity-80 z-20">
            <Wrench size={45} strokeWidth={1.5} />
          </div>
          <div className="absolute bottom-10 -right-8 text-[#EA4335] animate-[bounce_3s_infinite] opacity-80 z-20">
            <Hammer size={45} strokeWidth={1.5} />
          </div>
        </div>

        {/* Text Content */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-4 font-mono text-[10px] sm:text-xs tracking-[0.2em] text-[#FBBC05] uppercase">
            <span>[ sys.status ]</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] animate-ping shrink-0"></span>
            <span>in_development</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-pixelated mb-6 text-white leading-tight drop-shadow-md">
            Under <span className="text-[#FBBC05]">Construction</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Gyro is busy hammering away in the workshop! We're crafting
            something awesome for the GDG-HAU Digital ID Platform. Check back
            soon for exciting updates.
          </p>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-3 bg-[#1e1e1f] hover:bg-[#282829] text-white border border-white/10 text-xs sm:text-sm uppercase tracking-widest px-8 py-4 rounded-xl font-bold transition-all duration-200 active:scale-95 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] group"
          >
            <ArrowLeft
              size={18}
              className="text-[#4285F4] group-hover:-translate-x-1 transition-transform"
            />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
