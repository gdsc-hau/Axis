'use client';

import { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The HTML element ID where the scanner will render
    const qrCodeRegionId = 'html5qr-code-full-region';
    
    const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    
    // Config for the scanner
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    html5QrCode.start(
      { facingMode: 'environment' }, // Prefer back camera
      config,
      (decodedText) => {
        // Success callback
        html5QrCode.stop().then(() => {
          onScan(decodedText);
        }).catch((err) => {
          console.error("Failed to stop scanner", err);
          onScan(decodedText); // Proceed anyway
        });
      },
      (errorMessage) => {
        // Parse errors happen constantly as it scans empty frames, ignore them
      }
    ).catch((err) => {
      setError("Failed to start camera. Please ensure you have granted camera permissions.");
      console.error(err);
    });

    // Cleanup when component unmounts
    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12122a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-semibold">Scan Barcode / QR Code</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
          >
            ✕
          </button>
        </div>
        
        <div className="relative bg-black w-full aspect-square flex items-center justify-center">
          {error ? (
            <div className="text-red-400 p-6 text-center text-sm">{error}</div>
          ) : (
            <div id="html5qr-code-full-region" className="w-full h-full [&_video]:object-cover" />
          )}
        </div>
        
        <div className="p-4 text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">
            Align the code within the frame
          </p>
        </div>
      </div>
    </div>
  );
}
