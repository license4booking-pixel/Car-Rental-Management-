import React from 'react';
import { FileText, Download } from 'lucide-react';

export default function FormGenerator() {
  const forms = [
    { title: 'Standard Rental Agreement', decription: 'Default lease contract for daily or weekly rentals.' },
    { title: 'Vehicle Inspection Report', decription: 'Pre and post rental inspection checklist framework.' },
    { title: 'Damage Assessment Slip', decription: 'Forms for claiming cosmetic or structural damages.' },
    { title: 'Liability Waiver', decription: 'Standard release of liability for incidental events.' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Form Generator</h1>
        <p className="text-zinc-500 text-sm mt-1">Download and print standardized operational templates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map((form, i) => (
          <div key={i} className="bg-zinc-900 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition group">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-zinc-400 group-hover:text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">{form.title}</h3>
            <p className="text-zinc-500 text-sm mt-2 mb-6">{form.decription}</p>
            <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white">
              <Download className="w-4 h-4" /> Generate PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
