import React from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function QRScanner({ onScan, onClose }: { onScan: (text: string) => void, onClose: () => void }) {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      (decodedText) => {
        html5QrCode.stop().then(() => {
          onScan(decodedText);
        }).catch((err) => {
          console.error("Failed to stop scanner", err);
          onScan(decodedText);
        });
      },
      (errorMessage) => {
        // Ignored, happens repeatedly when no QR code is in view
      }
    ).catch((err) => {
      setError("Failed to start camera. Please ensure permissions are granted.");
      console.error(err);
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#09090b] border border-[#27272a] p-6 rounded-2xl w-full max-w-sm shadow-2xl relative flex flex-col items-center">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-500 hover:text-white z-10 transition-colors">
          <X size={20} />
        </button>
        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4">
          <Camera size={24} />
        </div>
        <h2 className="text-sm font-black text-white tracking-widest uppercase mb-1 text-center">Scan Fleet QR</h2>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest text-center mb-6">Point camera at vehicle QR code</p>
        
        {error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase text-center rounded-lg">
            {error}
          </div>
        ) : (
          <div id="qr-reader" className="w-full bg-black rounded-xl overflow-hidden border border-[#27272a] aspect-square"></div>
        )}
      </div>
    </div>
  );
}
