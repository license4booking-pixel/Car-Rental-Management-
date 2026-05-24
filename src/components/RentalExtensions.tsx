import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { Clock, Plus, Search } from 'lucide-react';

export default function RentalExtensions() {
  const [extensions, setExtensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'extensions')), (snap) => {
      setExtensions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    await addDoc(collection(db, 'extensions'), {
      reservationId: (form.elements.namedItem('reservationId') as HTMLInputElement).value,
      days: parseInt((form.elements.namedItem('days') as HTMLInputElement).value),
      reason: (form.elements.namedItem('reason') as HTMLInputElement).value,
      status: 'Pending',
      createdAt: serverTimestamp()
    });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Rental Extensions</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage requested and approved vehicle rental extensions.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-zinc-200">
          <Plus className="w-4 h-4" /> New Extension
        </button>
      </div>

      {showAdd && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-widest text-[10px]">Request Extension</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Reservation ID</label>
                <input name="reservationId" type="text" required className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2.5 text-white" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Additional Days</label>
                <input name="days" type="number" min="1" required className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2.5 text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Reason</label>
                <textarea name="reason" rows={3} required className="w-full bg-zinc-800 border border-white/10 rounded-lg p-2.5 text-white"></textarea>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white transition">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition uppercase text-[10px] tracking-wider">Submit</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Reservation ID</th>
              <th className="px-6 py-4">Days Extended</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
            ) : extensions.length === 0 ? (
               <tr><td colSpan={4} className="text-center py-8">No extensions filed.</td></tr>
            ) : (
              extensions.map(ext => (
                <tr key={ext.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-mono text-zinc-300">{ext.reservationId}</td>
                  <td className="px-6 py-4 text-white font-bold">{ext.days} Days</td>
                  <td className="px-6 py-4">{ext.reason}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold uppercase">{ext.status}</span>
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
