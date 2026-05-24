import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { AlertTriangle, Wrench } from 'lucide-react';

export default function OutOfService() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'vehicles'), where('status', 'in', ['Maintenance', 'Out of Service'])), (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Out of Service</h1>
        <p className="text-zinc-500 text-sm mt-1">Vehicles currently flagged as out of service or in maintenance.</p>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Vehicle</th>
              <th className="px-6 py-4">Plate</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : vehicles.length === 0 ? (
               <tr><td colSpan={4} className="text-center py-8">All vehicles are active.</td></tr>
            ) : (
              vehicles.map(v => (
                <tr key={v.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                     <div className="text-white font-bold">{v.make} {v.model}</div>
                     <div className="text-zinc-500 text-xs">{v.year}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-300">{v.plate}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-800/50 text-zinc-400 rounded text-[10px] font-bold uppercase">{v.status}</span>
                  </td>
                  <td className="px-6 py-4 text-amber-500">{v.condition || 'Needs Inspection'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
