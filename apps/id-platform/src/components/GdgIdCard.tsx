import { useRef } from 'react';
import QRCode from 'react-qr-code';
import DownloadActions from '@/components/DownloadActions';
import type { PublicMemberProfile } from '@hau/contracts';

interface GdgIdCardProps {
  profile: PublicMemberProfile;
  onEject: () => void;
}

export default function GdgIdCard({ profile, onEject }: GdgIdCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="animate-in fade-in zoom-in duration-300">
      {/* ID Card */}
      <div ref={cardRef} className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/60 bg-gradient-to-br from-[#1a1a3e] via-[#1e2060] to-[#0d0d2e] p-7">
        {/* Google color accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]" />
        
        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
          <div>
            <p className="text-[9px] text-gray-500 tracking-[0.2em] mb-0.5 uppercase">HAU Identifier</p>
            <p className="text-blue-400 font-bold text-xs sm:text-sm tracking-wide">{profile.hauId}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500 tracking-[0.2em] mb-0.5 uppercase">Program</p>
            <p className="text-gray-300 font-bold text-[11px] sm:text-xs truncate uppercase mt-0.5">{profile.program}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border border-white/5 bg-[#030305] p-3 rounded-xl gap-2">
        <div className="text-[9px] text-gray-500 space-y-1 uppercase tracking-wider min-w-0">
          <p className="truncate">sys.status: true</p>
          <p className="truncate">checksum: valid</p>
          <p className="text-[8px] text-blue-500/70 font-sans mt-2">© gdghau terminal</p>
        </div>
        
        <div className="bg-white p-1.5 rounded-lg transition-transform duration-300 hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.1)] shrink-0">
          <QRCode
            value={profile.hauId}
            size={64}
            bgColor="transparent"
            fgColor="#030305"
            level="L"
          />
        </div>
      </div>

      <DownloadActions cardRef={cardRef} hauId={profile.hauId} />

      <button
        onClick={onEject}
        className="mt-6 w-full border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/5 rounded-xl text-xs uppercase tracking-[0.2em] py-3.5 transition-all duration-200 font-bold shadow-inner"
      >
        [ EJECT PROFILE ]
      </button>
    </div>
  );
}
