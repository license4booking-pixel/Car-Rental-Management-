import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { AlertCircle, Car, User, Clock } from 'lucide-react';

export default function LateReturns() {
  const [lateReturns, setLateReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'reservations')), (snap) => {
      const now = new Date();
      const returns = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter((res: any) => res.status === 'Active' && res.endDate && new Date(res.endDate) < now)
        .map((res: any) => {
           const end = new Date(res.endDate);
           const diffTime = Math.abs(now.getTime() - end.getTime());
           const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           return { ...res, daysOverdue };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue);

      setLateReturns(returns);
      setLoading(false);
    });

    return unsub;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Late Returns</h1>
        <p className="text-zinc-500 text-sm mt-1">Vehicles that have not been returned by their due date.</p>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Customer ID</th>
              <th className="px-6 py-4">Vehicle ID</th>
              <th className="px-6 py-4">Expected Return</th>
              <th className="px-6 py-4">Days Overdue</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
            ) : lateReturns.length === 0 ? (
               <tr><td colSpan={5} className="text-center py-8">No late returns recorded.</td></tr>
            ) : (
              lateReturns.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{r.customerId}</td>
                  <td className="px-6 py-4 font-mono text-zinc-300">{r.vehicleId}</td>
                  <td className="px-6 py-4 text-zinc-300">{new Date(r.endDate).toLocaleString()}</td>
                  <td className="px-6 py-4 text-red-500 font-bold">{r.daysOverdue} Days</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[10px] font-bold uppercase flex items-center w-fit gap-1">
                      <AlertCircle className="w-3 h-3" /> Overdue
                    </span>
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
