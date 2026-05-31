import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, doc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function PaymentRentals() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(query(collection(db, 'rental_payments')), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
        const timeA = a.date?.toDate ? a.date.toDate().getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
        const timeB = b.date?.toDate ? b.date.toDate().getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
        return timeB - timeA;
      }));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleMarkAsPaid = async (id: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'rental_payments', id), {
        status: 'paid'
      });

      // If it's a synced client invoice, also automatically sync back to client record
      if (id.startsWith('cust_unpaid_')) {
        const customerId = id.replace('cust_unpaid_', '');
        const custRef = doc(db, 'customers', customerId);
        const custSnap = await getDoc(custRef);
        if (custSnap.exists()) {
          const custData = custSnap.data();
          const currentPaid = parseFloat(custData.amountPaid || 0);
          const currentDue = parseFloat(custData.amountDue || 0);
          
          await updateDoc(custRef, {
            amountPaid: currentPaid + currentDue,
            amountDue: 0,
            paymentStatus: 'Paid',
            status: 'Active Renter'
          });

          // Delete the unpaid tracker record and create a paid record instead
          await deleteDoc(doc(db, 'rental_payments', id));
          await setDoc(doc(db, 'rental_payments', 'cust_paid_' + customerId), {
            customerId,
            customerName: `${custData.firstName} ${custData.lastName}`,
            amount: currentPaid + currentDue,
            status: 'paid',
            description: `Total Amount Paid by ${custData.firstName} ${custData.lastName} (Synced)`,
            date: new Date()
          });
        }
      }
    } catch (err) {
      console.error("Error marking invoice paid:", err);
      alert('Failed to update status.');
    }
  };

  const paidPayments = payments.filter(p => p.status === 'paid' || p.status === 'completed');
  const unpaidPayments = payments.filter(p => p.status !== 'paid' && p.status !== 'completed');

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight uppercase italic font-black">Rental Payments Ledger</h1>
          <p className="text-zinc-500 text-sm mt-1">Automatic real-time mapping of all rental settlements, onboarding transactions, and installments.</p>
        </div>
      </div>

      {/* Paid Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-white">Rental Payments (Paid)</h2>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
            {paidPayments.length} Record{paidPayments.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-[#111113]/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500 border-b border-[#27272a]/40">
              <tr>
                <th className="px-6 py-4">Invoice ID / Source</th>
                <th className="px-6 py-4">Customer Name / Reservation</th>
                <th className="px-6 py-4">Memo Description</th>
                <th className="px-6 py-4">Amount Recv</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Settle Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/35">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">Loading dynamic directory context...</td></tr>
              ) : paidPayments.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-600 font-mono text-xs">No paid rental receipts available.</td></tr>
              ) : (
                paidPayments.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-zinc-400 select-all block">{p.id.toUpperCase()}</span>
                      {p.rentalId && <span className="text-[9px] text-zinc-600 font-mono mt-0.5 block">LINK: {p.rentalId.slice(0, 8).toUpperCase()}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-bold text-xs">{p.customerName || `RES #${(p.rentalId || p.reservationId || '').slice(0, 8).toUpperCase()}`}</p>
                      {p.customerId && <span className="text-[9px] text-zinc-500 font-mono">CID: {p.customerId.slice(0, 8).toUpperCase()}</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400 max-w-xs truncate" title={p.description}>
                      {p.description || 'Rental Agreement Settlement'}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-mono font-black text-xs">
                      ${p.amount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-[#10b981] text-[9px] font-black uppercase tracking-widest border border-emerald-500/15">
                        <CheckCircle size={10} /> Paid
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                      {p.date?.toDate ? p.date.toDate().toLocaleDateString() : (p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : (p.date ? new Date(p.date).toLocaleDateString() : 'N/A'))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unpaid Section */}
      <div className="space-y-4 pt-4 border-t border-[#27272a]/30">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          <h2 className="text-sm font-black uppercase tracking-wider text-white">Rental Payments (Unpaid & Outstanding)</h2>
          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
            {unpaidPayments.length} Record{unpaidPayments.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-[#111113]/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500 border-b border-b-[#27272a]/40">
              <tr>
                <th className="px-6 py-4">Invoice ID / Source</th>
                <th className="px-6 py-4">Customer Name / Reservation</th>
                <th className="px-6 py-4">Memo Description</th>
                <th className="px-6 py-4">Outstanding Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Invoice Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]/35 pb-12">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Loading dynamic directory context...</td></tr>
              ) : unpaidPayments.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-600 font-mono text-xs">No outstanding unpaid transactions listed.</td></tr>
              ) : (
                unpaidPayments.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-zinc-400 select-all block">{p.id.toUpperCase()}</span>
                      {p.rentalId && <span className="text-[9px] text-zinc-600 font-mono mt-0.5 block">LINK: {p.rentalId.slice(0, 8).toUpperCase()}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-bold text-xs">{p.customerName || `RES #${(p.rentalId || p.reservationId || '').slice(0, 8).toUpperCase()}`}</p>
                      {p.customerId && <span className="text-[9px] text-zinc-500 font-mono">CID: {p.customerId.slice(0, 8).toUpperCase()}</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400 max-w-xs truncate" title={p.description}>
                      {p.description || 'Rental Quote Settlement'}
                    </td>
                    <td className="px-6 py-4 text-rose-400 font-mono font-black text-xs animate-pulse">
                      ${p.amount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase tracking-widest border border-rose-500/15">
                        <Clock size={10} /> Outstanding
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                      {p.date?.toDate ? p.date.toDate().toLocaleDateString() : (p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : (p.date ? new Date(p.date).toLocaleDateString() : 'N/A'))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleMarkAsPaid(p.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 rounded text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-[0_2px_4px_rgba(16,185,129,0.25)] hover:shadow-[0_2px_8px_rgba(16,185,129,0.5)]"
                      >
                        Settle & Mark Paid
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

