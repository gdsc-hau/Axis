import { useRef, MouseEvent, TouchEvent, useCallback, useEffect } from 'react';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import { motion, useMotionValue, useSpring } from 'framer-motion';
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
  const rectRef = useRef<DOMRect | null>(null);
  const gdgCode = profile.hauId.replace(/\D/g, '') || '010101010110101';

  // rAF ref used to throttle mousemove to one update per frame
  const rafRef = useRef<number | null>(null);
  
  // Touch & Spin Tracking
  const touchStartX = useRef<number | null>(null);
  const touchLastTime = useRef<number | null>(null);
  const currentSpin = useRef(0);

  // Use MotionValues to avoid React re-renders during mouse move
  const xRotation = useMotionValue(0);
  const yRotation = useMotionValue(0);
  const springScale = useSpring(1, { stiffness: 300, damping: 20 });
  const springOpacity = useSpring(0.2, { stiffness: 300, damping: 20 });

  // Increased stiffness to reduce the "mushy" feel that contributes to perceived lag
  const rotateX = useSpring(xRotation, { stiffness: 400, damping: 40 });
  const rotateY = useSpring(yRotation, { stiffness: 400, damping: 40 });

  const handleMouseEnter = () => {
    springScale.set(1.02);
    springOpacity.set(0.4);
    if (cardRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const rect = rectRef.current;
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateXValue = ((y - centerY) / centerY) * -10;
      const rotateYValue = ((x - centerX) / centerX) * 10;

      xRotation.set(rotateXValue);
      yRotation.set(rotateYValue + currentSpin.current);
    });
  }, [xRotation, yRotation]);

  const handleMouseLeave = () => {
    springScale.set(1);
    springOpacity.set(0.2);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    xRotation.set(0);
    yRotation.set(currentSpin.current);
  };
  
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    springScale.set(1.02);
    springOpacity.set(0.4);
    if (cardRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect();
    }
    touchStartX.current = e.touches[0].clientX;
    touchLastTime.current = Date.now();
  };

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const rect = rectRef.current;
      if (!rect) return;
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateXValue = ((y - centerY) / centerY) * -15; // slightly stronger tilt on mobile
      const rotateYValue = ((x - centerX) / centerX) * 15;

      xRotation.set(rotateXValue);
      yRotation.set(rotateYValue + currentSpin.current);
    });
  }, [xRotation, yRotation]);

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    springScale.set(1);
    springOpacity.set(0.2);
    
    if (touchStartX.current !== null && touchLastTime.current !== null) {
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchEndX - touchStartX.current;
      const deltaTime = Date.now() - touchLastTime.current;
      
      const velocity = deltaX / deltaTime;
      
      if (Math.abs(velocity) > 1.2) {
        // Flick detected
        const spinDirection = velocity > 0 ? 1 : -1;
        currentSpin.current += 360 * spinDirection;
      }
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    xRotation.set(0);
    yRotation.set(currentSpin.current);
    
    touchStartX.current = null;
    touchLastTime.current = null;
  };

  const requestOrientationPermission = () => {
    if (typeof (window.DeviceOrientationEvent as any)?.requestPermission === 'function') {
      (window.DeviceOrientationEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            // Permission granted, sensor data will now flow to the listener
          }
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma; 
      const beta = event.beta;
      
      if (gamma !== null && beta !== null) {
        // Assume phone held near 45deg tilt. Shift beta so 45deg is 'flat'
        const normalizedBeta = beta - 45;
        const rotateXValue = Math.max(-20, Math.min(20, -normalizedBeta));
        const rotateYValue = Math.max(-20, Math.min(20, gamma));
        
        xRotation.set(rotateXValue);
        yRotation.set(rotateYValue + currentSpin.current);
      }
    };
    
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [xRotation, yRotation]);

  // Simplified color lookup to ensure clean block scope
  const deptUpper = profile.department?.toUpperCase() || "";
  const deptColor = Object.entries(deptColors).find(([key]) =>
    deptUpper.includes(key)
  )?.[1] || "#ffffff";

  return (
    <div
      className="relative animate-in fade-in zoom-in duration-300 w-[92vw] sm:w-full max-w-sm mx-auto font-pixelated z-10"
      style={{ perspective: "1000px" }}
    >
      {/* Ambient Glow Background */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(circle, ${deptColor} 0%, transparent 70%)`,
          opacity: springOpacity
        }}
      />

      {/* 5.1 Card Component */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={requestOrientationPermission}
        style={{
          borderColor: deptColor,
          boxShadow: `0 0 30px ${deptColor}33, inset 0 0 20px ${deptColor}1A`,
          rotateX,
          rotateY,
          scale: springScale,
          transformStyle: 'preserve-3d',
          touchAction: 'none',
        }}
        className="relative z-10 bg-crt-noise border-2 p-3 sm:p-5 rounded-lg sm:rounded-xl overflow-visible flex flex-col gap-3 text-white will-change-transform cursor-pointer transform-gpu"
      >
        {/* Thickness / Perspective Layer */}
        <div 
          className="absolute inset-0 rounded-lg sm:rounded-xl border-2 pointer-events-none z-[-1]"
          style={{
            transform: 'translateZ(-6px)',
            borderColor: deptColor,
            backgroundColor: `${deptColor}10`,
            boxShadow: `0 10px 30px rgba(0,0,0,0.4)`,
          }}
        />

        {/* Sub-content wrapper for 3D pop */}
        <div style={{ transform: 'translateZ(15px)', transformStyle: 'preserve-3d' }} className="flex flex-col gap-3 w-full h-full relative">

        {/* 5.2 Header Component */}
        <div className="flex items-center space-x-3 border-2 border-white p-2">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            {/* GDG_LOGO_PLACEHOLDER */}
            <Image src="/gdg_icon.png" alt="GDG Logo" fill className="animate-[pulse_4s_infinite] object-contain" />
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
          <div
            className="w-5/12 p-2 border-r border-dashed border-white relative bg-[#111] overflow-hidden flex items-center justify-center"
            style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', isolation: 'isolate' }}
          >
            {/* QR Code - encodes cardholder email */}
            <QRCode
              value={profile.email}
              size={256}
              bgColor="#111111"
              fgColor="#ffffff"
              level="M"
              style={{ width: '100%', height: 'auto', maxHeight: '100%', shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
            />
          </div>

          <div className="w-7/12 p-2 relative bg-black flex items-center justify-center">
            {/* SKULL_GRAPHIC_PLACEHOLDER */}
            <div className="relative w-28 h-28 flex items-center justify-center -ml-4 z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              <Image src="/skull.png" alt="Skull Graphic" fill className="object-contain" />
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
        </div>
      </motion.div>

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
