import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { 
  IdCard, QrCode, Calendar, UserCog, Users, 
  Award, ShieldCheck, DoorOpen, 
  UserPlus, FileSignature, Clock, BadgeCheck, 
  PartyPopper, Zap, Lock, Database 
} from 'lucide-react';

const features = [
  { icon: IdCard, title: 'Digital Membership ID', desc: 'Your personalized GDG-HAU digital identity card.' },
  { icon: QrCode, title: 'QR Code Verification', desc: 'Fast, secure scanning for event check-ins.' },
  { icon: Calendar, title: 'Event Registration', desc: 'Seamlessly access and register for upcoming events.' },
  { icon: UserCog, title: 'Profile Management', desc: 'Update and manage your member information.' },
  { icon: Users, title: 'Community Tools', desc: 'Engage with fellow tech enthusiasts & members.' },
  { icon: Award, title: 'Certificate Tracking', desc: 'View and verify your earned event certificates.' },
  { icon: ShieldCheck, title: 'Secure Verification', desc: 'Advanced identity confirmation system.' },
  { icon: DoorOpen, title: 'Access Control', desc: 'Streamlined entry for exclusive GDG-HAU events.' },
];

const steps = [
  { title: 'Register Account', desc: 'Sign up using your credentials.', icon: UserPlus, color: 'text-[#4285F4]', border: 'border-[#4285F4]/30' },
  { title: 'Complete Profile', desc: 'Fill in your academic details.', icon: FileSignature, color: 'text-[#EA4335]', border: 'border-[#EA4335]/30' },
  { title: 'Await Verification', desc: 'Admins review your membership.', icon: Clock, color: 'text-[#FBBC05]', border: 'border-[#FBBC05]/30' },
  { title: 'Access Digital ID', desc: 'Receive your unique member ID.', icon: BadgeCheck, color: 'text-[#34A853]', border: 'border-[#34A853]/30' },
  { title: 'Join Events', desc: 'Participate in workshops & more.', icon: PartyPopper, color: 'text-purple-400', border: 'border-purple-400/30' },
];

const benefits = [
  { title: 'Faster Check-ins', desc: 'Skip the line with instantaneous QR code scanning at the door.', icon: Zap },
  { title: 'Verified Identity', desc: 'Trust within the community through admin-verified memberships.', icon: ShieldCheck },
  { title: 'Organized Participation', desc: 'Keep track of all your attended events in one single place.', icon: Calendar },
  { title: 'Professional Presence', desc: 'Showcase your involvement with a digital membership portfolio.', icon: IdCard },
];

const securityFeatures = [
  { title: 'Data Privacy', desc: 'Your personal info is strictly managed and never exposed publicly.', icon: Lock },
  { title: 'Admin Controls', desc: 'Strict role-based access to sensitive member verification data.', icon: Database },
  { title: 'Secure Auth', desc: 'Industry-standard authentication and secure session management.', icon: ShieldCheck },
];

export default function About() {
  return (
    <main className="min-h-screen relative flex flex-col items-center bg-[#030305] overflow-x-hidden text-cyan-50 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Custom Keyframe Styles (Reused from home for background consistency) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes lavaLeftSlow {
          0% { transform: translateY(80vh) scale(1, 1.2); opacity: 0.15; }
          30% { transform: translateY(40vh) scale(1.1, 0.9); opacity: 0.25; }
          50% { transform: translateY(-10vh) scale(1.3, 0.8); opacity: 0.15; }
          75% { transform: translateY(35vh) scale(0.9, 1.1); opacity: 0.25; }
          100% { transform: translateY(80vh) scale(1, 1.2); opacity: 0.15; }
        }
        @keyframes lavaLeftFast {
          0% { transform: translateY(-20vh) scale(1.2, 0.8); opacity: 0.15; }
          40% { transform: translateY(30vh) scale(0.9, 1.15); opacity: 0.2; }
          70% { transform: translateY(75vh) scale(1.1, 0.9); opacity: 0.1; }
          90% { transform: translateY(20vh) scale(1, 1.2); opacity: 0.25; }
          100% { transform: translateY(-20vh) scale(1.2, 0.8); opacity: 0.15; }
        }
        @keyframes lavaRightSlow {
          0% { transform: translateY(75vh) scale(1.1, 0.9); opacity: 0.1; }
          35% { transform: translateY(15vh) scale(0.95, 1.2); opacity: 0.2; }
          60% { transform: translateY(-15vh) scale(1.25, 0.85); opacity: 0.15; }
          80% { transform: translateY(45vh) scale(1, 1.1); opacity: 0.2; }
          100% { transform: translateY(75vh) scale(1.1, 0.9); opacity: 0.1; }
        }
        @keyframes lavaRightFast {
          0% { transform: translateY(-15vh) scale(1.3, 0.8); opacity: 0.15; }
          25% { transform: translateY(25vh) scale(0.9, 1.1); opacity: 0.2; }
          55% { transform: translateY(80vh) scale(1.15, 0.95); opacity: 0.1; }
          85% { transform: translateY(30vh) scale(1, 1.2); opacity: 0.2; }
          100% { transform: translateY(-15vh) scale(1.3, 0.8); opacity: 0.15; }
        }
        .lava-blue { animation: lavaLeftSlow 28s ease-in-out infinite; }
        .lava-red { animation: lavaLeftFast 22s ease-in-out infinite; }
        .lava-yellow { animation: lavaRightSlow 32s ease-in-out infinite; }
        .lava-green { animation: lavaRightFast 25s ease-in-out infinite; }
        .glow-blue { background: radial-gradient(circle, rgba(66, 133, 244, 0.3) 0%, rgba(66, 133, 244, 0.05) 40%, rgba(0,0,0,0) 70%); }
        .glow-red { background: radial-gradient(circle, rgba(234, 67, 53, 0.25) 0%, rgba(234, 67, 53, 0.05) 40%, rgba(0,0,0,0) 70%); }
        .glow-yellow { background: radial-gradient(circle, rgba(251, 188, 5, 0.2) 0%, rgba(251, 188, 5, 0.03) 40%, rgba(0,0,0,0) 70%); }
        .glow-green { background: radial-gradient(circle, rgba(52, 168, 83, 0.25) 0%, rgba(52, 168, 83, 0.05) 40%, rgba(0,0,0,0) 70%); }
      `}} />

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
            <div className="flex items-center gap-2 mb-4 font-mono text-[10px] sm:text-xs tracking-[0.2em] text-[#4285F4] uppercase">
              <span>[ sys.about ]</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4] animate-ping shrink-0"></span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-pixelated mb-6 text-white leading-tight drop-shadow-md">
              About the <span className="text-[#EA4335]">GDG-HAU</span> <br/> Digital ID Platform
            </h1>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-8">
              A centralized digital identity system designed exclusively for GDG on Campus Holy Angel University members. Seamlessly connect, verify, and participate.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 font-mono">
              <a href="#features" className="bg-[#1e1e1f] hover:bg-[#282829] text-white border border-white/10 text-xs sm:text-sm uppercase tracking-widest px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-lg shadow-black/50">
                Explore Features
              </a>
              <Link href="/" className="bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-[#4285F4] border border-[#4285F4]/30 text-xs sm:text-sm uppercase tracking-widest px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(66,133,244,0.15)]">
                Get Started
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center relative w-full max-w-[300px] md:max-w-[400px]">
            <div className="absolute inset-0 bg-[#4285F4]/20 blur-[80px] rounded-full" />
            <Image 
              src="/assets/images/gyro/gyro_pose.png" 
              alt="Gyro Mascot" 
              width={400} 
              height={400} 
              className="relative z-10 object-contain drop-shadow-[0_0_25px_rgba(66,133,244,0.3)] hover:-translate-y-4 hover:scale-105 transition-all duration-500" 
            />
          </div>
        </section>

        {/* WHAT IS THE PLATFORM? */}
        <section className="w-full mb-32 bg-[#0a0a0d]/80 backdrop-blur-sm border border-white/5 rounded-3xl p-8 sm:p-12 relative overflow-hidden group hover:border-white/10 transition-colors duration-500 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FBBC05]/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#34A853]/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="w-full md:w-1/3 flex justify-center relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#4285F4]/20 to-[#EA4335]/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <Image 
                src="/assets/images/gyro/hiding_curtain.png" 
                alt="Gyro hiding" 
                width={250} 
                height={250} 
                className="object-contain drop-shadow-xl group-hover:-translate-y-2 transition-transform duration-500 relative z-10" 
              />
            </div>
            <div className="w-full md:w-2/3">
              <h2 className="text-3xl sm:text-4xl font-pixelated text-white mb-6 flex items-center gap-3">
                <span className="text-[#EA4335]">{'//'}</span> What is the Platform?
              </h2>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-8">
                The GDG-HAU Digital ID Platform is a comprehensive digital identity and member management ecosystem. Designed for students, developers, and tech enthusiasts, it provides streamlined access to memberships, events, and verification tools all in one unified hub.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono text-gray-300">
                <li className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-xl border border-white/5">
                  <div className="w-2 h-2 bg-[#4285F4] rounded-full shadow-[0_0_8px_#4285F4]" /> Digital Membership
                </li>
                <li className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-xl border border-white/5">
                  <div className="w-2 h-2 bg-[#EA4335] rounded-full shadow-[0_0_8px_#EA4335]" /> Event Access
                </li>
                <li className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-xl border border-white/5">
                  <div className="w-2 h-2 bg-[#FBBC05] rounded-full shadow-[0_0_8px_#FBBC05]" /> Verified Identity
                </li>
                <li className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-xl border border-white/5">
                  <div className="w-2 h-2 bg-[#34A853] rounded-full shadow-[0_0_8px_#34A853]" /> Community Hub
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CORE FEATURES */}
        <section id="features" className="w-full mb-32 relative scroll-mt-32">
          <div className="text-center mb-16 relative">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-pixelated text-white mb-4">Core Features</h2>
            <div className="w-16 h-1 bg-[#4285F4] mx-auto rounded-full mb-4 opacity-50" />
            <p className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest">Platform Capabilities</p>
            <div className="absolute right-4 md:right-12 top-0 hidden sm:block opacity-50 hover:opacity-100 transition-opacity duration-300">
              <Image src="/assets/images/gyro/gyro_head_icon.png" alt="Gyro Head" width={60} height={60} className="hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="group relative bg-[#131314]/80 backdrop-blur-sm border border-white/5 p-6 rounded-2xl hover:border-[#4285F4]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(66,133,244,0.3)]">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#4285F4]/20 group-hover:text-[#4285F4] text-gray-400 transition-colors duration-300">
                  <feature.icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-pixelated text-xl mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="w-full mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-pixelated text-white mb-4">How It Works</h2>
            <div className="w-16 h-1 bg-[#EA4335] mx-auto rounded-full mb-4 opacity-50" />
            <p className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest">Your Journey Starts Here</p>
          </div>
          <div className="relative">
            {/* Connecting line for desktop */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-4 relative z-10">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center group">
                  <div className={`w-16 h-16 rounded-2xl bg-[#0a0a0d] border ${step.border} flex items-center justify-center mb-6 shadow-lg relative group-hover:scale-110 transition-transform duration-300 z-10`}>
                    <step.icon size={28} className={step.color} strokeWidth={1.5} />
                    {/* Tiny step number */}
                    <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#1e1e1f] border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-gray-300">
                      0{idx + 1}
                    </div>
                  </div>
                  <h3 className="text-white font-pixelated text-lg sm:text-xl mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-xs sm:text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY IT MATTERS (BENEFITS) */}
        <section className="w-full mb-32 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-pixelated text-white mb-4">Why It Matters</h2>
            <div className="w-16 h-1 bg-[#FBBC05] mx-auto rounded-full mb-4 opacity-50" />
            <p className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest">Platform Benefits</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-5 bg-gradient-to-br from-white/[0.03] to-transparent p-6 sm:p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[#FBBC05]/10 flex items-center justify-center text-[#FBBC05]">
                  <benefit.icon size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-white font-bold font-sans text-base sm:text-lg mb-2">{benefit.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECURITY & TRUST */}
        <section className="w-full mb-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-pixelated text-white mb-4">Security & Trust</h2>
            <div className="w-16 h-1 bg-[#34A853] mx-auto rounded-full mb-4 opacity-50" />
            <p className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest">Safe & Reliable</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {securityFeatures.map((sec, idx) => (
              <div key={idx} className="bg-[#131314] p-6 rounded-2xl border border-white/5 text-center flex flex-col items-center group hover:bg-[#1a1a1c] transition-colors">
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4 text-[#34A853] group-hover:scale-110 group-hover:bg-[#34A853]/10 transition-all">
                  <sec.icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-white font-pixelated text-xl mb-3">{sec.title}</h3>
                <p className="text-gray-500 text-sm">{sec.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="w-full relative bg-gradient-to-b from-[#4285F4]/10 to-transparent border border-[#4285F4]/20 rounded-3xl p-10 sm:p-16 text-center overflow-hidden flex flex-col items-center group">
          <div className="absolute inset-0 bg-[url('/assets/images/gyro/gyro_lowbattery.png')] bg-center bg-no-repeat opacity-5 mix-blend-overlay pointer-events-none" />
          
          <div className="relative z-10 mb-8">
            <Image 
              src="/assets/images/gyro/surprise_gyro_icon.png" 
              alt="Surprised Gyro" 
              width={100} 
              height={100} 
              className="mx-auto drop-shadow-[0_0_15px_rgba(66,133,244,0.5)] group-hover:-translate-y-2 transition-transform duration-500"
            />
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-pixelated text-white mb-4 relative z-10">Ready to Join GDG-HAU?</h2>
          <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto mb-10 relative z-10">
            Start your journey with a verified digital identity. Connect with peers, attend exclusive events, and elevate your tech career.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 font-mono relative z-10">
            <Link href="/" className="bg-[#4285F4] hover:bg-[#3367d6] text-white text-xs sm:text-sm uppercase tracking-widest px-8 py-4 rounded-xl font-bold transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(66,133,244,0.4)]">
              Register Now
            </Link>
            <a href="https://gdg.community.dev/gdg-on-campus-holy-angel-university-angeles-philippines/" target="_blank" rel="noopener noreferrer" className="bg-transparent hover:bg-white/5 text-white border border-white/20 text-xs sm:text-sm uppercase tracking-widest px-8 py-4 rounded-xl font-bold transition-all duration-200 active:scale-95">
              Learn More
            </a>
          </div>
        </section>
        
      </div>
    </main>
  );
}
