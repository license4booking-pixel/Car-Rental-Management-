import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, X } from 'lucide-react';

export default function VehicleDamages() {
  const [damages, setDamages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formReporter, setFormReporter] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSeverity, setFormSeverity] = useState('minor');

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'vehicle_damages')), (snap) => {
      setDamages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const handleOpenNew = (e: any) => {
      if (e.detail === 'damage') setIsAdding(true);
    };
    window.addEventListener('open-new-record', handleOpenNew);

    return () => {
      unsub();
      window.removeEventListener('open-new-record', handleOpenNew);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    try {
      await addDoc(collection(db, 'vehicle_damages'), {
        vehicleId: formVehicleId,
        reporter: formReporter,
        description: formDescription,
        severity: formSeverity,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setFormVehicleId('');
      setFormReporter('');
      setFormDescription('');
      setFormSeverity('minor');
    } catch (err) {
      console.error(err);
      alert('Failed to report damage.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vehicle Damages</h1>
          <p className="text-zinc-500 text-sm mt-1">Logged exterior and interior vehicle damages.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Report Damage
        </button>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Vehicle ID</th>
              <th className="px-6 py-4">Reported By</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : damages.length === 0 ? (
               <tr><td colSpan={4} className="text-center py-8">No damage reports.</td></tr>
            ) : (
              damages.map(d => (
                <tr key={d.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{d.vehicleId}</td>
                  <td className="px-6 py-4 text-zinc-300">{d.reporter}</td>
                  <td className="px-6 py-4 text-white">{d.description}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-[10px] font-bold uppercase">{d.severity}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-[#27272a] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-4">Report Damage</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Vehicle ID or License</label>
                <input 
                  type="text" required value={formVehicleId} onChange={e => setFormVehicleId(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Reporter Name</label>
                <input 
                  type="text" required value={formReporter} onChange={e => setFormReporter(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Description of Damage</label>
                <textarea 
                  required value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Severity</label>
                <select 
                  value={formSeverity} onChange={e => setFormSeverity(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none appearance-none"
                >
                  <option value="minor">Minor (Scratches, Dents)</option>
                  <option value="moderate">Moderate (Broken glass, flat tire)</option>
                  <option value="severe">Severe (Undrivable, heavy collision)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-wider">
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
