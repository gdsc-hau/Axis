'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string | string[];
}

interface FaqAccordionProps {
  category: string;
  items: FaqItem[];
  icon?: React.ReactNode;
}

export default function FaqAccordion({ category, items, icon }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mb-10 w-full max-w-4xl mx-auto">
      <h3 className="text-xl md:text-2xl font-bold text-white mb-5 flex items-center gap-3 font-mono border-b border-white/10 pb-3">
        {icon}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          {category}
        </span>
      </h3>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index}
              className={`border rounded-xl overflow-hidden transition-all duration-300 ${isOpen ? 'bg-white/10 border-blue-500/30 shadow-[0_0_15px_rgba(66,133,244,0.15)]' : 'bg-[#030305]/60 border-white/10 hover:bg-white/5 hover:border-white/20'}`}
            >
              <button
                onClick={() => toggleOpen(index)}
                className="w-full text-left px-5 py-4 flex items-center justify-between focus:outline-none"
              >
                <span className="font-semibold text-gray-200 pr-4">{item.q}</span>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={`shrink-0 ${isOpen ? 'text-blue-400' : 'text-gray-400'}`}
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-gray-400 text-sm md:text-base leading-relaxed border-t border-white/5 pt-3 mt-1">
                      {Array.isArray(item.a) ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {item.a.map((bullet, i) => (
                            <li key={i}>{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{item.a}</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}