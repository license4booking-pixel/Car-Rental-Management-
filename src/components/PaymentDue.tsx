import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { BellRing, ShieldAlert, Car, User, Clock, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PaymentDue() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Lookups
  const [customers, setCustomers] = useState<{ [key: string]: any }>({});
  const [vehicles, setVehicles] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    if (!db) return;

    const unsubCust = onSnapshot(query(collection(db, 'customers')), (snap) => {
      const c: any = {};
      snap.forEach(d => { c[d.id] = { id: d.id, ...d.data() }; });
      setCustomers(c);
    });

    const unsubVeh = onSnapshot(query(collection(db, 'vehicles')), (snap) => {
      const v: any = {};
      snap.forEach(d => { v[d.id] = { id: d.id, ...d.data() }; });
      setVehicles(v);
    });

    const unsubRes = onSnapshot(query(collection(db, 'reservations')), (snap) => {
      const resDocs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      // Calculate dynamic payment fields for demo logic
      const paymentsDue = resDocs.map(res => {
        const start = res.startDate ? new Date(res.startDate) : new Date();
        const end = res.endDate ? new Date(res.endDate) : new Date();
        const amtDue = res.totalAmount || 0;
        const deposit = res.depositStatus === 'paid' ? 0 : 50; 
        
        let status = 'Pending';
        let daysOverdue = 0;
        const now = new Date();
        
        // Pseudo logic for due dates based on end date
        if (now > end) {
          status = 'Overdue';
          const diffTime = Math.abs(now.getTime() - end.getTime());
          daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          ...res,
          dueDate: end.toISOString(),
          amountDue: amtDue,
          depositBalance: deposit,
          paymentStatus: status,
          daysOverdue,
          disabled: false
        };
      });

      setPayments(paymentsDue);
      setLoading(false);
    });

    return () => {
      unsubCust();
      unsubVeh();
      unsubRes();
    };
  }, []);

  const handleReminder = (resId: string) => {
    alert(`Payment reminder sent for reservation ${resId}!`);
  };

  const handleDisableVehicle = (vehicleId: string) => {
    if(confirm('Are you sure you want to disable engine ignition for this vehicle automatically?')) {
      alert(`Immobilization pulse sent. Vehicle ${vehicleId} has been disabled.`);
    }
  };

  const filtered = payments.filter(p => {
    const cust = customers[p.customerId];
    const cName = cust ? `${cust.firstName || ''} ${cust.lastName || ''}`.toLowerCase() : '';
    const v = vehicles[p.vehicleId];
    const vName = v ? `${v.make} ${v.model} ${v.plate}`.toLowerCase() : '';
    return cName.includes(search.toLowerCase()) || vName.includes(search.toLowerCase());
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments Due</h1>
          <p className="text-zinc-500 text-sm mt-1">Track outstanding balances, overdues, and immobilize vehicles.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-zinc-800/50 p-2 rounded-xl ring-1 ring-white/10 w-full sm:w-96">
        <Search className="w-5 h-5 text-zinc-500 ml-2" />
        <input 
          type="text"
          placeholder="Search by customer or vehicle..."
          className="bg-transparent border-none text-white focus:outline-none w-full placeholder:text-zinc-600 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-800/50 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4 border-l border-white/5">Due Date/Time</th>
                <th className="px-6 py-4 border-l border-white/5">Amount Due</th>
                <th className="px-6 py-4 border-l border-white/5">Deposit</th>
                <th className="px-6 py-4 border-l border-white/5">Status</th>
                <th className="px-6 py-4 border-l border-white/5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="animate-pulse flex items-center justify-center gap-2 text-zinc-500">
                      <Clock className="w-4 h-4" /> Syncing network...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    No active payments due found.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const cust = customers[p.customerId] || { firstName: 'Unknown', lastName: 'Customer' };
                  const veh = vehicles[p.vehicleId] || { make: 'Unknown', model: 'Vehicle', plate: '---' };
                  
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5">
                            <User className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{cust.firstName} {cust.lastName}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{p.customerId.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white">{veh.make} {veh.model}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-zinc-800 text-[10px] font-mono text-zinc-400 rounded ring-1 ring-white/10 uppercase">
                            {veh.plate}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-white/5">
                        <div className="text-zinc-300">
                          {new Date(p.dueDate).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {new Date(p.dueDate).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-white/5 font-mono text-white">
                        ${p.amountDue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 border-l border-white/5 font-mono text-zinc-400 text-[12px]">
                        ${p.depositBalance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 border-l border-white/5">
                        {p.paymentStatus === 'Overdue' ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Overdue
                            </span>
                            <span className="text-[10px] text-red-400/80 font-bold ml-1">
                              {p.daysOverdue} Days
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 w-fit">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 border-l border-white/5 space-x-2">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleReminder(p.id)}
                            className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/10"
                            title="Send Reminder"
                          >
                            <BellRing className="w-4 h-4" />
                          </button>
                          
                          <button 
                            onClick={() => handleDisableVehicle(p.vehicleId)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-red-500/20 flex items-center gap-2"
                            title="Disable Vehicle Engine"
                          >
                            <ShieldAlert className="w-4 h-4" />
                            Disable
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
