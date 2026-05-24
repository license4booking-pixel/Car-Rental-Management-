import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus } from 'lucide-react';

export default function PaymentInsurance() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'insurance_payments')), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Insurance Payments</h1>
          <p className="text-zinc-500 text-sm mt-1">Track payments submitted to insurance providers and policies.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Policy #</th>
              <th className="px-6 py-4">Vehicle ID</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : payments.length === 0 ? (
               <tr><td colSpan={4} className="text-center py-8">No insurance payments recorded.</td></tr>
            ) : (
              payments.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{p.policyNumber}</td>
                  <td className="px-6 py-4 font-mono text-zinc-300">{p.vehicleId}</td>
                  <td className="px-6 py-4 text-white font-mono">${p.amount?.toFixed(2) || '0.00'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-bold uppercase">{p.status}</span>
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
