import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { Wrench } from 'lucide-react';

export default function RepairStatus() {
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'repairs')), (snap) => {
      setRepairs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Repair Status</h1>
          <p className="text-zinc-500 text-sm mt-1">Monitor vehicles currently undergoing repairs or scheduled for shop visits.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Vehicle ID</th>
              <th className="px-6 py-4">Shop Vendor</th>
              <th className="px-6 py-4">Estimated Cost</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : repairs.length === 0 ? (
               <tr><td colSpan={4} className="text-center py-8">No active repairs.</td></tr>
            ) : (
              repairs.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{r.vehicleId}</td>
                  <td className="px-6 py-4 text-zinc-300">{r.vendor}</td>
                  <td className="px-6 py-4 text-white font-mono">${r.cost?.toFixed(2) || '0.00'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-500 rounded text-[10px] font-bold uppercase">{r.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
