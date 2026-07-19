"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const teaserTimer = setTimeout(() => setTeaserVisible(false), 8000);
    return () => clearTimeout(teaserTimer);
  }, []);

  useEffect(() => {
    const handleVisibility = (e: Event) => {
      const customEvent = e as CustomEvent<{ visible: boolean }>;
      setIsVisible(customEvent.detail.visible);
    };

    window.addEventListener("chatbot-visibility", handleVisibility);
    return () => window.removeEventListener("chatbot-visibility", handleVisibility);
  }, []);

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[9998]"
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30, transformOrigin: "bottom right" }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="absolute bottom-20 right-0 w-[90vw] sm:w-[400px] h-[600px] max-h-[70vh] bg-white border border-gray-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#4285f4]/5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#4285f4]/10 flex items-center justify-center border border-[#4285f4]/20">
                      <Sparkles className="w-4 h-4 text-[#4285f4]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-800">Gyro the Bot</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Online</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Iframe Container */}
                <div className="flex-grow bg-white">
                  <iframe
                    src="https://app.livechatai.com/aibot-iframe/cmpsffky801eojo04lz7afaev"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="microphone"
                    title="Gyro the Bot"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse Effect Background */}
          {!isOpen && (
            <motion.div
              animate={{
                scale: [0.95, 1.3],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: [0.215, 0.61, 0.355, 1],
              }}
              className="absolute inset-0 rounded-full bg-[#4285f4] -z-10"
            />
          )}

          {/* Retro Teaser */}
          <AnimatePresence>
            {teaserVisible && !isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 0.95, y: [0, -5, 0], scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  y: {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 }
                }}
                className="absolute right-[68px] sm:right-[76px] bottom-[12px] bg-[#1f2937] text-white px-3.5 py-1.5 rounded-xl border-2 border-[#fbbc05] font-mono text-[0.9rem] sm:text-[1.1rem] whitespace-nowrap shadow-lg pointer-events-none z-50"
                style={{ fontFamily: 'var(--font-vt323), monospace' }}
              >
                Ask Gyro the Bot! 🤖
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10"
          >
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => !isOpen && setTeaserVisible(true)}
              onClick={() => setIsOpen(!isOpen)}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-[0_10px_30px_rgba(66,133,244,0.4)] flex items-center justify-center transition-all duration-500 overflow-hidden ${
                isOpen ? "bg-white text-gray-800 rotate-90" : "bg-white text-white p-0 border-4 border-[#4285f4] hover:border-[#34a853]"
              }`}
            >
            {isOpen ? (
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            ) : (
              <Image
                src="/assets/images/chatbot_icon.png"
                alt="Gyro the Bot"
                fill
                className="object-cover"
              />
            )}
            
            {!isOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white" 
              />
            )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
