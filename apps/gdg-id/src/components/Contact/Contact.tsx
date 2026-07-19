'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { 
  Mail, Facebook, Instagram, Linkedin, 
  HelpCircle,
  ChevronDown, ExternalLink
} from 'lucide-react';

const contactMethods = [
  { 
    title: 'Email Support', 
    desc: 'Reach out directly for inquiries.',
    icon: Mail, 
    label: 'gdsc.holyangel@gmail.com', 
    href: 'mailto:gdsc.holyangel@gmail.com',
    color: 'text-[#EA4335]',
    bg: 'bg-[#EA4335]/10',
    border: 'hover:border-[#EA4335]/50'
  },
  { 
    title: 'Facebook Page', 
    desc: 'Follow for news and announcements.',
    icon: Facebook, 
    label: '@gdsc.hau', 
    href: 'https://www.facebook.com/gdsc.hau',
    color: 'text-[#4285F4]',
    bg: 'bg-[#4285F4]/10',
    border: 'hover:border-[#4285F4]/50'
  },
  { 
    title: 'Instagram', 
    desc: 'Catch our latest event highlights.',
    icon: Instagram, 
    label: '@gdgoc_hau', 
    href: 'https://www.instagram.com/gdgoc_hau/',
    color: 'text-[#E1306C]', // Generic pink/red
    bg: 'bg-[#E1306C]/10',
    border: 'hover:border-[#E1306C]/50'
  },
  { 
    title: 'LinkedIn', 
    desc: 'Connect with our professional network.',
    icon: Linkedin, 
    label: 'GDG HAU', 
    href: 'https://www.linkedin.com/company/gdg-hau/posts/?feedView=all',
    color: 'text-[#0A66C2]', // LinkedIn Blue
    bg: 'bg-[#0A66C2]/10',
    border: 'hover:border-[#0A66C2]/50'
  },
];

const quickHelp = [
  { question: "What is the typical response time?", answer: "Our community team usually responds within 24-48 hours during weekdays. For urgent matters, try reaching out via our Facebook page." },
  { question: "Who do I contact for event partnerships?", answer: "Please send an email to gdsc.holyangel@gmail.com with the subject line [Partnership Inquiry] and our leads will get back to you." },
  { question: "Where can I report platform issues?", answer: "If you encounter bugs or issues with your Digital ID, please email our support team directly with screenshots." },
];

export default function Contact() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

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

      <div className="relative w-full z-10 flex flex-col items-center pt-28 md:pt-32 px-4 pb-20 max-w-6xl mx-auto">
        
        {/* HERO SECTION */}
        <section className="w-full flex flex-col-reverse md:flex-row items-center justify-between gap-12 mb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 mb-4 font-mono text-[10px] sm:text-xs tracking-[0.2em] text-[#34A853] uppercase">
              <span>[ sys.contact ]</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] animate-ping shrink-0"></span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-pixelated mb-6 text-white leading-tight drop-shadow-md">
              Get in Touch with <br/><span className="text-[#34A853]">GDG-HAU</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-8">
              We're here to help you build, connect, and grow. Whether you have a question, need support, or want to collaborate, don't hesitate to reach out!
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 font-mono">
              <a href="#methods" className="bg-[#1e1e1f] hover:bg-[#282829] text-white border border-white/10 text-xs sm:text-sm uppercase tracking-widest px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-lg shadow-black/50">
                Contact Methods
              </a>
              <a href="#faq" className="bg-[#34A853]/10 hover:bg-[#34A853]/20 text-[#34A853] border border-[#34A853]/30 text-xs sm:text-sm uppercase tracking-widest px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(52,168,83,0.15)]">
                Quick Help
              </a>
            </div>
          </div>
          <div className="flex-1 flex justify-center relative w-full max-w-[300px] md:max-w-[400px]">
            <div className="absolute inset-0 bg-[#34A853]/20 blur-[80px] rounded-full" />
            <Image 
              src="/assets/images/gyro/gyro_standing.png" 
              alt="Gyro Mascot Waving" 
              width={350} 
              height={350} 
              className="relative z-10 object-contain drop-shadow-[0_0_25px_rgba(52,168,83,0.3)] hover:-translate-y-4 hover:scale-105 transition-all duration-500" 
            />
          </div>
        </section>

        {/* FUN INTERACTION / CHOOSE METHOD */}
        <section id="methods" className="w-full mb-16 scroll-mt-32">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left bg-gradient-to-r from-transparent via-white/[0.03] to-transparent p-8 rounded-3xl border-y border-white/5">
            <Image 
              src="/assets/images/gyro/head_openmouth_icon.png" 
              alt="Gyro Happy" 
              width={80} 
              height={80} 
              className="object-contain drop-shadow-[0_0_15px_rgba(251,188,5,0.4)] animate-bounce"
            />
            <div>
              <h2 className="text-2xl sm:text-3xl font-pixelated text-white mb-2">Gyro is ready to help you connect!</h2>
              <p className="text-gray-400 font-mono text-sm">Choose your favorite platform below to reach our team.</p>
            </div>
          </div>
        </section>

        {/* CONTACT METHODS GRID */}
        <section className="w-full mb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contactMethods.map((method, idx) => (
              <a 
                key={idx} 
                href={method.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`group relative bg-[#131314]/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${method.border} flex items-center gap-6 overflow-hidden`}
              >
                <div className={`w-16 h-16 rounded-2xl ${method.bg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                  <method.icon size={30} className={method.color} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold font-sans text-lg mb-1">{method.title}</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-2">{method.desc}</p>
                  <div className={`text-xs font-mono font-semibold flex items-center gap-2 ${method.color}`}>
                    {method.label}
                    <ExternalLink size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </div>
                </div>
                
                {/* Subtle corner glow based on color */}
                <div className={`absolute -bottom-8 -right-8 w-24 h-24 blur-[40px] rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${method.bg.replace('/10', '')}`} />
              </a>
            ))}
          </div>
        </section>

        {/* QUICK HELP / FAQ */}
        <section id="faq" className="w-full mb-32 scroll-mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-pixelated text-white mb-4">Quick Help</h2>
            <div className="w-16 h-1 bg-[#EA4335] mx-auto rounded-full mb-4 opacity-50" />
            <p className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest">Common Questions</p>
          </div>
          <div className="flex flex-col gap-4">
            {quickHelp.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-[#0a0a0d]/80 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden transition-colors hover:border-white/10"
              >
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <h3 className="text-white font-bold font-sans text-base sm:text-lg flex items-center gap-3">
                    <HelpCircle size={18} className="text-[#EA4335]" />
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    size={20} 
                    className={`text-gray-500 transition-transform duration-300 ${openFaqIndex === idx ? 'rotate-180 text-white' : ''}`} 
                  />
                </button>
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === idx ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="text-gray-400 text-sm leading-relaxed pl-7 border-l-2 border-white/5 ml-[9px]">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="w-full relative bg-gradient-to-b from-[#FBBC05]/10 to-transparent border border-[#FBBC05]/20 rounded-3xl p-10 sm:p-16 text-center overflow-hidden flex flex-col items-center group">
          <div className="absolute inset-0 bg-[url('/assets/images/gyro/gyro_lowbattery.png')] bg-center bg-no-repeat opacity-5 mix-blend-overlay pointer-events-none" />
          
          <div className="relative z-10 mb-8">
            <Image 
              src="/assets/images/gyro/surprise_gyro_icon.png" 
              alt="Surprised Gyro" 
              width={100} 
              height={100} 
              className="mx-auto drop-shadow-[0_0_15px_rgba(251,188,5,0.5)] group-hover:-translate-y-2 transition-transform duration-500"
            />
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-pixelated text-white mb-4 relative z-10">Let's Build Together</h2>
          <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto mb-10 relative z-10">
            Join the conversation, participate in events, and stay updated with the latest from GDG on Campus Holy Angel University.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 font-mono relative z-10">
            <a href="https://gdg.community.dev/gdg-on-campus-holy-angel-university-angeles-philippines/" target="_blank" rel="noopener noreferrer" className="bg-[#FBBC05] hover:bg-[#e3aa04] text-black text-xs sm:text-sm uppercase tracking-widest px-8 py-4 rounded-xl font-bold transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(251,188,5,0.3)]">
              Join Our Community
            </a>
          </div>
        </section>
        
      </div>
    </main>
  );
}