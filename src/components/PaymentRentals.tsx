import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { Plus } from 'lucide-react';

export default function PaymentRentals() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'rental_payments')), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Rental Payments</h1>
          <p className="text-zinc-500 text-sm mt-1">History of all rental settlements and installments.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Reservation ID</th>
              <th className="px-6 py-4">Amount Paid</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : payments.length === 0 ? (
               <tr><td colSpan={4} className="text-center py-8">No rental payments recorded.</td></tr>
            ) : (
              payments.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{p.id}</td>
                  <td className="px-6 py-4 font-mono text-zinc-300">{p.reservationId}</td>
                  <td className="px-6 py-4 text-white font-mono text-green-400">+ ${p.amount?.toFixed(2) || '0.00'}</td>
                  <td className="px-6 py-4 text-zinc-500">{p.createdAt?.toDate ? p.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
