import React from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Send, 
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function RentalAgreement({ onBack }: { onBack: () => void }) {
  const [isSignOpen, setIsSignOpen] = React.useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Reservations</span>
        </button>
        <div className="flex gap-3">
          <button className="p-2.5 bg-white/5 border border-white/5 text-slate-400 rounded-xl hover:text-white transition-colors">
            <Printer size={18} />
          </button>
          <button className="p-2.5 bg-white/5 border border-white/5 text-slate-400 rounded-xl hover:text-white transition-colors">
            <Download size={18} />
          </button>
          <button className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <Send size={16} /> Send to Customer
          </button>
        </div>
      </div>

      <div className="bg-white text-black p-12 md:p-16 rounded-3xl shadow-2xl space-y-12 min-h-[1000px] font-serif leading-relaxed">
        <div className="flex justify-between items-start border-b-2 border-black pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-4 italic">Philly Rental Sys HQ</h1>
            <p className="text-xs font-sans font-bold text-slate-500 uppercase tracking-widest leading-loose">
              123 Fleet Way, Innovation District<br />
              San Francisco, CA 94103<br />
              +1 (888) VOLT-DRV
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase mb-2">Rental Agreement</h2>
            <p className="text-sm font-sans font-medium text-slate-500">REF: RA-2024-0012</p>
            <p className="text-sm font-sans font-medium text-slate-500">DATE: MAY 15, 2026</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 font-sans">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 underline">Customer Information</h3>
            <p className="font-bold text-lg">John Fitzgerald Doe</p>
            <p className="text-sm text-slate-600 mt-1">DL: CA-99283-X10</p>
            <p className="text-sm text-slate-600">john@example.com</p>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 underline">Vehicle Information</h3>
            <p className="font-bold text-lg">2023 Tesla Model 3</p>
            <p className="text-sm text-slate-600 mt-1">Plates: BCD 4567</p>
            <p className="text-sm text-slate-600">Color: Midnight Silver Metallic</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-100 pb-2">1. Terms and Conditions</h3>
          <p className="text-sm text-slate-700">
            The Renter agrees to the rental session starting on <strong>May 15, 2026</strong> and ending on <strong>May 18, 2026</strong>. 
            The vehicle must be returned to the office location by 12:00 PM on the scheduled return date.
          </p>
          <p className="text-sm text-slate-700">
            A state of charge (SoC) above 80% is required upon return. A charging fee of $50 will be applied if the SoC is below this threshold.
            Smoking and pets are strictly prohibited inside the vehicle. A cleaning fee of $250 will be assessed for any violations.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-100 pb-2">2. Financial Disclosure</h3>
          <table className="w-full text-sm font-sans">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 text-slate-600">Daily Rate ($120.00 x 3 days)</td>
                <td className="py-3 text-right font-bold">$360.00</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-600">Insurance (Premium Coverage)</td>
                <td className="py-3 text-right font-bold">$75.00</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-600">Airport Selection Fee</td>
                <td className="py-3 text-right font-bold">$25.00</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="py-4 font-black">TOTAL AMOUNT DUE</td>
                <td className="py-4 text-right font-black text-xl italic">$460.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pt-12 grid grid-cols-2 gap-12 font-sans">
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Renter Signature</p>
            <div className="h-16 flex items-end">
              <span className="text-2xl font-serif italic text-blue-600 select-none">John Fitzgerald Doe</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Officer Signature</p>
            <div className="h-16 flex items-end">
              <span className="text-2xl font-serif italic text-slate-400 select-none opacity-50">Philly Rental Digital Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
