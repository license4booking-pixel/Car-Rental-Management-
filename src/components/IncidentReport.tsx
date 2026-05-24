import React from 'react';
import { AlertTriangle, Send } from 'lucide-react';

export default function IncidentReport() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Incident Report Form</h1>
        <p className="text-zinc-500 text-sm mt-1">Log accident details, third-party involvement, and immediate actions taken.</p>
      </div>

      <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 md:p-8 space-y-8">
        
        <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">Ensure all emergency services have been contacted if there are any injuries. Gather police report numbers before submitting if applicable.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Date & Time of Incident</label>
             <input type="datetime-local" className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition" />
           </div>
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Location of Incident</label>
             <input type="text" placeholder="Street name, City, State" className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition" />
           </div>
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Vehicle Involved</label>
             <input type="text" placeholder="Vehicle Plate or ID" className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition" />
           </div>
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Renter/Driver Name</label>
             <input type="text" placeholder="Full Name" className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition" />
           </div>
        </div>

        <div className="pt-4 border-t border-white/5">
          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Incident Description</label>
          <textarea rows={5} placeholder="Describe what happened in detail..." className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition resize-y"></textarea>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Police Report Number</label>
             <input type="text" placeholder="Optional" className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition" />
           </div>
           <div>
             <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-2">Action Taken</label>
             <select className="w-full bg-black/50 border border-white/5 rounded-lg p-3 text-white focus:border-white/20 outline-none transition">
               <option>Select action...</option>
               <option>Vehicle Towed</option>
               <option>Vehicle Driven Away</option>
               <option>Awaiting Assessment</option>
             </select>
           </div>
        </div>

        <div className="flex justify-end pt-4">
          <button className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition">
            <Send className="w-4 h-4" />
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
