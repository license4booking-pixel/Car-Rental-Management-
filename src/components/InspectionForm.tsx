import React from 'react';
import { ClipboardCheck, Car, CheckCircle2, ChevronRight } from 'lucide-react';

export default function InspectionForm() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Vehicle Inspection Form</h1>
        <p className="text-zinc-500 text-sm mt-1">Fill out the inspection details before and after a rental.</p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Reservation ID</label>
             <input type="text" placeholder="RES-XXXXXX" className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition" />
           </div>
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Vehicle Plate</label>
             <input type="text" placeholder="ABC-1234" className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition" />
           </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-blue-500" /> Exterior Checklist
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {['Front Bumper', 'Rear Bumper', 'Left Doors', 'Right Doors', 'Windshield', 'Tires / Wheels'].map(item => (
              <label key={item} className="flex items-center gap-3 p-3 bg-black/50 border border-white/5 rounded-lg cursor-pointer hover:border-white/20 transition">
                <input type="checkbox" className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-blue-600/50 bg-zinc-800" />
                <span className="text-sm text-zinc-300">{item}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="pt-4 border-t border-white/5">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-500" /> Interior Checklist
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {['Seats Clean', 'Floor Mats', 'Dashboard', 'Fuel Level Checked', 'Odometer Logged', 'Keys Present'].map(item => (
              <label key={item} className="flex items-center gap-3 p-3 bg-black/50 border border-white/5 rounded-lg cursor-pointer hover:border-white/20 transition">
                <input type="checkbox" className="w-4 h-4 rounded border-zinc-700 text-amber-600 focus:ring-amber-600/50 bg-zinc-800" />
                <span className="text-sm text-zinc-300">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Inspector Notes</label>
          <textarea rows={4} placeholder="Any additional notes or damage descriptions..." className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition resize-y"></textarea>
        </div>

        <div className="flex justify-end pt-4">
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition">
            <CheckCircle2 className="w-4 h-4" />
            Submit Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
