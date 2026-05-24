import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function PaymentDeposits() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'reservations'), where('depositStatus', 'in', ['Paid', 'Held', 'paid', 'held'])), (snap) => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Deposits</h1>
        <p className="text-zinc-500 text-sm mt-1">Currently held security deposits for active and pending rentals.</p>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Reservation ID</th>
              <th className="px-6 py-4">Customer ID</th>
              <th className="px-6 py-4">Vehicle ID</th>
              <th className="px-6 py-4">Deposit Amount</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
            ) : reservations.length === 0 ? (
               <tr><td colSpan={5} className="text-center py-8">No deposits held.</td></tr>
            ) : (
              reservations.map(r => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{r.id}</td>
                  <td className="px-6 py-4 font-mono text-zinc-500">{r.customerId}</td>
                  <td className="px-6 py-4 font-mono text-zinc-500">{r.vehicleId}</td>
                  <td className="px-6 py-4 text-white font-mono">$500.00</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-[10px] font-bold uppercase">{r.depositStatus}</span>
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
