"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "FAQs", href: "/faq" },
    { name: "Contact", href: "/contact" },
    { name: "Coming Soon", href: "/coming-soon" },
  ];

  return (
    <header className="absolute top-0 left-0 w-full px-4 md:px-8 py-4 flex items-center justify-between z-50 border-b border-white/5 bg-[#030305]/40 backdrop-blur-md font-mono">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/" className="flex items-center justify-center shrink-0">
          <Image
            src="/gdg_icon.png"
            alt="GDG Logo"
            width={40}
            height={40}
            className="animate-[pulse_4s_infinite] w-8 h-8 md:w-10 md:h-10 object-contain"
          />
        </Link>
        <Link href="/">
          <h2 className="text-white font-bold text-xs md:text-sm uppercase tracking-wider line-clamp-1">
            Google Developer Group
          </h2>
          <p className="text-blue-500 text-[10px] md:text-xs font-semibold tracking-tight mt-0.5">
            Holy Angel University
          </p>
        </Link>
      </div>

      {/* RIGHT ACTION ZONE */}
      <div className="flex items-center gap-4 md:gap-8">
        {/* Desktop Links (Hidden on Mobile) */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`${isActive ? "text-white font-semibold" : "text-gray-400"} hover:text-white transition-colors tracking-wide`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Yellow Interface Toggle (Always visible, sits beside burger on mobile) */}
        <div className="w-12 h-6 bg-yellow-400/20 rounded-full border border-yellow-400/50 relative cursor-pointer flex items-center shrink-0">
          <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)] absolute right-1 transition-all"></div>
        </div>

        {/* Mobile Menu Action Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex md:hidden items-center justify-center w-8 h-8 text-gray-400 hover:text-white transition-colors focus:outline-none"
          title="Toggle Menu"
        >
          {menuOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Expansion Navigation Panel */}
      {menuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#030305]/95 backdrop-blur-xl border-b border-white/5 md:hidden flex flex-col p-5 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50 shadow-2xl">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`${isActive ? "text-white font-semibold" : "text-gray-400"} hover:text-white text-sm py-2.5 border-b border-white/5 transition-colors tracking-wide`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
