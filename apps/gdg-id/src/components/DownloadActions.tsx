'use client';

import { useState, type RefObject } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface DownloadActionsProps {
  cardRef: RefObject<HTMLDivElement | null>;
  hauId: string;
}

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export default function DownloadActions({ cardRef, hauId }: DownloadActionsProps) {
  const [downloading, setDownloading] = useState<'jpg' | 'pdf' | null>(null);

  const captureCard = async () => {
    if (!cardRef.current) throw new Error('Card element not found');
    return html2canvas(cardRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });
  };

  const handleDownloadJPG = async () => {
    let newTab: Window | null = null;
    const canUseShare = typeof navigator !== 'undefined' && !!navigator.share;
    if (isIOS() && !canUseShare) {
      newTab = window.open('', '_blank');
    }

    try {
      setDownloading('jpg');
      const canvas = await captureCard();
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error('Canvas to Blob failed');
      
      const file = new File([blob], `${hauId}.jpg`, { type: 'image/jpeg' });
      
      let shared = false;
      if (canUseShare && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'GDG ID Card',
          });
          shared = true;
        } catch (shareErr) {
          console.error('Share failed, falling back to direct download:', shareErr);
        }
      } 
      
      if (!shared) {
        const fileUrl = URL.createObjectURL(blob);
        if (isIOS()) {
          if (newTab) {
            newTab.location.href = fileUrl;
          } else {
            window.open(fileUrl, '_blank');
          }
        } else {
          const link = document.createElement('a');
          link.download = `${hauId}.jpg`;
          link.href = fileUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setTimeout(() => URL.revokeObjectURL(fileUrl), 10000);
      } else {
        if (newTab) newTab.close();
      }
    } catch (err) {
      console.error('JPG download failed:', err);
      if (newTab) newTab.close();
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPDF = async () => {
    let newTab: Window | null = null;
    const canUseShare = typeof navigator !== 'undefined' && !!navigator.share;
    if (isIOS() && !canUseShare) {
      newTab = window.open('', '_blank');
    }

    try {
      setDownloading('pdf');
      const canvas = await captureCard();
      const imgData = canvas.toDataURL('image/png');

      // Size the PDF page to match the card's aspect ratio (in mm)
      const pxToMm = 0.264583;
      const pageWidth = canvas.width * pxToMm;
      const pageHeight = canvas.height * pxToMm;

      const pdf = new jsPDF({
        orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pageWidth, pageHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `${hauId}.pdf`, { type: 'application/pdf' });
      
      let shared = false;
      if (canUseShare && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'GDG ID Card',
          });
          shared = true;
        } catch (shareErr) {
          console.error('Share failed, falling back to direct download:', shareErr);
        }
      } 
      
      if (!shared) {
        const fileUrl = URL.createObjectURL(pdfBlob);
        if (isIOS()) {
          if (newTab) {
            newTab.location.href = fileUrl;
          } else {
            window.open(fileUrl, '_blank');
          }
        } else {
          const link = document.createElement('a');
          link.download = `${hauId}.pdf`;
          link.href = fileUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setTimeout(() => URL.revokeObjectURL(fileUrl), 10000);
      } else {
        if (newTab) newTab.close();
      }
    } catch (err) {
      console.error('PDF download failed:', err);
      if (newTab) newTab.close();
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex gap-3 mt-6">
      <button
        onClick={handleDownloadJPG}
        disabled={downloading !== null}
        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-3 border border-white/10 transition-all duration-200"
      >
        {downloading === 'jpg' ? (
          <Spinner />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        Save JPG
      </button>
      <button
        onClick={handleDownloadPDF}
        disabled={downloading !== null}
        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-sm font-semibold rounded-xl py-3 border border-white/10 transition-all duration-200"
      >
        {downloading === 'pdf' ? (
          <Spinner />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        Save PDF
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
