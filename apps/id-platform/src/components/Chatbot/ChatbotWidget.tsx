"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9998]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-20 right-0 w-[90vw] sm:w-[400px] h-[600px] max-h-[70vh] bg-white border border-gray-200 shadow-2xl rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#4285f4]/5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#4285f4]/10 flex items-center justify-center border border-[#4285f4]/20">
                  <Sparkles className="w-4 h-4 text-[#4285f4]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-800">GDG Bot Support</h3>
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
                title="GDG AI Chatbot"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 ${
          isOpen ? "bg-white text-gray-800 rotate-90" : "bg-[#4285f4] text-white p-0 overflow-hidden border-2 border-[#4285f4]"
        }`}
      >
        {isOpen ? (
          <X className="w-8 h-8" />
        ) : (
          <img
            src="/assets/images/chatbot_icon.png"
            alt="GDG Bot"
            className="w-full h-full object-cover"
          />
        )}
        
        {!isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" 
          />
        )}
      </motion.button>
    </div>
  );
}
