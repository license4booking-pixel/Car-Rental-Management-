import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus } from 'lucide-react';

export default function PaymentFines() {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'fines')), (snap) => {
      setFines(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Fines & Penalties</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage traffic tickets, late fees, and penalty charges.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Reference</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Customer ID</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
            ) : fines.length === 0 ? (
               <tr><td colSpan={5} className="text-center py-8">No fines or penalties recorded.</td></tr>
            ) : (
              fines.map(f => (
                <tr key={f.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{f.id}</td>
                  <td className="px-6 py-4 text-white uppercase text-[10px] tracking-wider">{f.type || 'FEE'}</td>
                  <td className="px-6 py-4 font-mono text-zinc-500">{f.customerId}</td>
                  <td className="px-6 py-4 text-red-400 font-mono">${f.amount?.toFixed(2) || '0.00'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[10px] font-bold uppercase">{f.status || 'UNPAID'}</span>
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
