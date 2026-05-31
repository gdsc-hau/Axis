import { useRef, useState, MouseEvent } from 'react';
import DownloadActions from '@/components/DownloadActions';
import type { PublicMemberProfile } from '@hau/contracts';

interface GdgIdCardProps {
  profile: PublicMemberProfile;
  onEject: () => void;
}

const deptColors: Record<string, string> = {
  SAS: '#9ca3af', // gray-400
  SBA: '#facc15', // yellow-400
  SHTM: '#f472b6', // pink-400
  SED: '#3b82f6', // blue-500
  SEA: '#ef4444', // red-500
  SOC: '#f97316', // orange-500
  SNAMS: '#22c55e', // green-500
  CCJEF: '#8b5cf6', // violet-500
};

export default function GdgIdCard({ profile, onEject }: GdgIdCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const gdgCode = profile.hauId.replace(/\D/g, '') || '010101010110101';
  
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (-15 to 15 degrees)
    const rotateXValue = ((y - centerY) / centerY) * -15;
    const rotateYValue = ((x - centerX) / centerX) * 15;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  let deptColor = '#ffffff';
  if (profile.department) {
    const deptUpper = profile.department.toUpperCase();
    for (const [key, color] of Object.entries(deptColors)) {
      if (deptUpper.includes(key)) {
        deptColor = color;
        break;
      }
    }
  }

  return (
    <div 
      className="relative animate-in fade-in zoom-in duration-300 w-full max-w-sm mx-auto font-pixelated z-10"
      style={{ perspective: '1000px' }}
    >
      {/* Ambient Glow Background */}
      <div 
        className="absolute inset-0 z-0 blur-[80px] opacity-30 transition-all duration-500"
        style={{ backgroundColor: deptColor }}
      />

      {/* 5.1 Card Component */}
      <div 
        ref={cardRef} 
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          borderColor: deptColor,
          boxShadow: isHovered 
            ? `0 20px 40px -10px ${deptColor}80, 0 0 20px ${deptColor}40, 0 0 40px ${deptColor}20` 
            : `0 0 30px ${deptColor}33`,
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
          transition: isHovered ? 'none' : 'transform 0.5s ease, box-shadow 0.5s ease',
        }}
        className="relative z-10 bg-crt-noise border-2 p-4 sm:p-5 rounded-lg overflow-hidden flex flex-col gap-3 text-white transform-gpu will-change-transform cursor-pointer"
      >
        {/* 5.2 Header Component */}
        <div className="flex items-center space-x-3 border-2 border-white p-2">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            {/* GDG_LOGO_PLACEHOLDER */}
            <img src="/gdg_icon.png" alt="GDG Logo" className="animate-[pulse_4s_infinite] w-full h-full object-contain" />
          </div>
          <div className="flex-grow">
            <h1 className="uppercase font-bold text-xl sm:text-2xl leading-none tracking-wide text-white">Google Developers Group</h1>
            <p className="text-xs sm:text-sm mt-1 text-gray-200">On Campus - Holy Angel University</p>
          </div>
        </div>

        <div className="w-full border-b-2 border-dashed border-white opacity-50 my-1"></div>

        {/* 5.3 YearSection Component */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 flex-grow">
            {/* GLITCH_GRAPHIC_1_PLACEHOLDER */}
            <div className="flex">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-4 h-4 bg-white ${i % 2 === 0 ? 'mt-4' : ''}`}></div>
              ))}
            </div>
            {/* GLITCH_GRAPHIC_2_PLACEHOLDER */}
            <div className="grid grid-cols-10 gap-0.5 opacity-80 flex-grow max-w-[80px]">
              {[...Array(30)].map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 ${i % 3 === 0 ? 'bg-white' : 'bg-gray-400'}`}></div>
              ))}
            </div>
          </div>
          
          <div className="text-4xl sm:text-5xl font-bold flex tracking-wider">
            <span className="text-red-500 glitch-effect" data-text="2">2</span>
            <span className="text-blue-500 glitch-effect" data-text="6">6</span>
            <span className="text-white mx-0.5">'</span>
            <span className="text-green-500 glitch-effect" data-text="2">2</span>
            <span className="text-yellow-500 glitch-effect" data-text="7">7</span>
          </div>
        </div>

        <div className="w-full border-b-2 border-dashed border-white opacity-50 my-1"></div>

        {/* 5.4 ImagePanelSection Component */}
        <div className="flex border-2 border-white h-40">
          <div className="w-5/12 p-1 border-r border-dashed border-white relative bg-[#111] overflow-hidden">
            {/* WAVY_GLITCH_IMAGE_PLACEHOLDER */}
            <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,#fff_3px,#fff_6px)]" style={{ filter: 'url(#wavy-filter)' }}></div>
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center mix-blend-overlay"></div>
          </div>
          
          <div className="w-7/12 p-2 relative bg-black flex items-center justify-center">
            {/* SKULL_GRAPHIC_PLACEHOLDER */}
            <div className="relative w-28 h-28 flex items-center justify-center -ml-4 z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              <img src="/skull.png" alt="Skull Graphic" className="w-full h-full object-contain" />
            </div>
            
            {/* BINARY_CODE_PLACEHOLDER */}
            <div className="absolute bottom-2 left-2 text-[8px] text-blue-400 font-mono leading-[1.1]">
              <p>0101011010</p>
              <p>1101010101</p>
              <p>0101010101</p>
              <p>1100101011</p>
            </div>
            
            {/* Abstract asterisks */}
            <div className="absolute top-2 left-2 flex space-x-1 text-white text-xs">
              <span>*</span><span>*</span><span>*</span>
            </div>
          </div>
        </div>

        {/* 5.5 MottoSection Component */}
        <div className="flex flex-col mt-2">
          <h2 className="uppercase font-bold text-2xl sm:text-[28px] leading-none tracking-wide flex justify-between w-full">
            <span className="text-red-500 glitch-effect" data-text="BUILD.">BUILD.</span>
            <span className="text-blue-500 glitch-effect" data-text="LEAD.">LEAD.</span>
            <span className="text-green-500 glitch-effect" data-text="TRANSFORM.">TRANSFORM.</span>
          </h2>
        </div>

        <div className="flex justify-between items-center h-10 gap-2 mb-1">
           {/* ABSTRACT_GRAPHIC_1_PLACEHOLDER */}
           <div className="flex h-full w-1/2 items-center space-x-2">
             <div className="w-8 h-full flex flex-col justify-between">
                {[...Array(6)].map((_, i) => <div key={i} className="w-full h-[2px] bg-white"></div>)}
             </div>
             <div className="h-full flex-grow bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSJ0cmFuc3BhcmVudCI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjUiPjwvcGF0aD4KPC9zdmc+')] opacity-70"></div>
           </div>
           {/* ABSTRACT_GRAPHIC_2_PLACEHOLDER */}
           <div className="w-1/2 flex justify-center items-center h-full border-2 border-white bg-transparent">
             <div className="w-full h-full rounded-full border border-white mx-2 flex items-center justify-center">
               <div className="w-4 h-4 bg-white transform rotate-45"></div>
             </div>
           </div>
        </div>

        <div className="w-full border-b-2 border-dashed border-white opacity-50 my-1"></div>

        {/* 5.6 InfoSection Component */}
        <div className="border-2 border-white">
          <div className="border-b-2 border-white py-1 px-4 flex space-x-2 text-xl text-white">
             <span>*</span><span>*</span><span>*</span><span>*</span>
          </div>
          
          <div className="flex justify-between items-center py-2 sm:py-2.5 px-4 border-b-2 border-white bg-white/5">
            <span className="font-bold text-gray-300 text-sm sm:text-base">GDG_CODE:</span>
            <span className="font-mono tracking-widest text-white">{gdgCode}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 sm:py-2.5 px-4 border-b-2 border-white">
            <span className="font-bold text-gray-300 text-sm sm:text-base">IDENTITY_NAME:</span>
            <span className="uppercase text-white tracking-wide">{profile.fullName}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 sm:py-2.5 px-4 border-b-2 border-white bg-white/5">
            <span className="font-bold text-gray-300 text-sm sm:text-base">EMAIL:</span>
            <span className="lowercase text-white font-sans text-xs sm:text-sm tracking-wide">{profile.email}</span>
          </div>
          
          <div className="flex justify-between items-center py-2 sm:py-2.5 px-4">
            <span className="font-bold text-gray-300 text-sm sm:text-base">PROGRAM:</span>
            <span className="uppercase text-white tracking-wide">{profile.program.replace(/ /g, '_')}</span>
          </div>
        </div>

        {/* SVG Filter for wavy effect */}
        <svg className="hidden">
          <defs>
            <filter id="wavy-filter">
              <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="15" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

      </div>

      <div className="mt-6 font-sans relative z-10">
        <DownloadActions cardRef={cardRef} hauId={profile.hauId} />
      </div>

      <button
        onClick={onEject}
        className="mt-4 w-full border-2 border-dashed border-white/40 bg-[#111] text-gray-300 hover:text-white hover:border-white hover:bg-white/10 py-3.5 transition-all font-bold tracking-[0.3em] uppercase rounded-lg font-pixelated text-xl relative z-10"
      >
        [ EJECT_PROFILE ]
      </button>
    </div>
  );
}
