'use client';

import { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

// Share a single promise chain across mounts to prevent concurrent camera access
// and resolve the React Strict Mode double-initialization issue.
let scannerCleanupPromise: Promise<void> = Promise.resolve();

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const qrCodeRegionId = 'html5qr-code-full-region';
    let html5QrCode: Html5Qrcode | null = null;

    // Config for the scanner
    const config = {
      fps: 20, // Increased FPS to 20 for faster/more sensitive scan frames
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const width = Math.min(320, Math.floor(viewfinderWidth * 0.85));
        const height = Math.min(100, Math.floor(viewfinderHeight * 0.35));
        return { width, height };
      },
      aspectRatio: 1.777778,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true, // Use hardware-accelerated native barcode detector if available
      },
    };

    // Chain the initialization of this scanner instance onto the cleanup of any previous scanner instance
    const startPromise = scannerCleanupPromise.then(async () => {
      if (!isMounted) return;

      // Restrict scanning formats to speed up frame decoding and improve overall sensitivity
      html5QrCode = new Html5Qrcode(qrCodeRegionId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });

      try {
        await html5QrCode.start(
          { facingMode: 'environment' }, // Prefer back camera
          config,
          (decodedText) => {
            if (!isMounted) return;

            // Stop the scanner when code is detected, and report scan
            const stopPromise = html5QrCode?.stop() || Promise.resolve();
            scannerCleanupPromise = stopPromise.catch(() => {});
            stopPromise.then(() => {
              onScan(decodedText);
            }).catch((err) => {
              console.error("Failed to stop scanner", err);
              onScan(decodedText); // Proceed anyway
            });
          },
          (errorMessage) => {
            // Parse errors happen constantly as it scans empty frames, ignore them
          }
        );
      } catch (err) {
        if (isMounted) {
          setError("Failed to start camera. Please ensure you have granted camera permissions.");
          console.error(err);
        }
      }
    });

    // Cleanup when component unmounts
    return () => {
      isMounted = false;
      // Update the scannerCleanupPromise to wait for startup to finish, then stop the scanner if scanning
      scannerCleanupPromise = startPromise.then(async () => {
        if (html5QrCode && html5QrCode.isScanning) {
          try {
            await html5QrCode.stop();
          } catch (err) {
            console.error("Failed to stop scanner during cleanup", err);
          }
        }
      });
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12122a] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-semibold">Scan Student ID Barcode</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="relative bg-black w-full aspect-[16/9] flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-red-400 p-6 text-center text-sm">{error}</div>
          ) : (
            <div id="html5qr-code-full-region" className="!w-full !h-full overflow-hidden [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video]:!object-center" />
          )}
        </div>

        <div className="p-4 text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">
            Align the barcode within the frame
          </p>
        </div>
      </div>
    </div>
  );
}
