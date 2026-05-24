import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, MapPin, Hash, User, Edit2, Trash2, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import CSVImporter from './CSVImporter';
import { cn } from '../lib/utils';

export default function ReservationManagement({ setView }: { setView: (v: string) => void }) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Core lookups
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Search/Filters
  const [search, setSearch] = useState('');

  // New Reservation State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Editing state
  const [editingReservation, setEditingReservation] = useState<any | null>(null);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editVehicleId, setEditVehicleId] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState('quote');

  useEffect(() => {
    if (!db) return;

    // Real-time reservation sync
    const qReservations = query(collection(db, 'reservations'));
    const unsubRes = onSnapshot(qReservations, (snap) => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Failed to Sync Reservations:", err);
      setLoading(false);
    });

    // Sync customers for lookup
    const qCustomers = query(collection(db, 'customers'));
    const unsubCust = onSnapshot(qCustomers, (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Sync vehicles for lookup
    const qVehicles = query(collection(db, 'vehicles'));
    const unsubVeh = onSnapshot(qVehicles, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubRes();
      unsubCust();
      unsubVeh();
    };
  }, [db]);

  const handleCreateReservation = async () => {
    if (!selectedCustomerId || !selectedVehicleId || !startDate || !endDate) {
      alert("Missing required fields");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, 'reservations'), {
        customerId: selectedCustomerId,
        vehicleId: selectedVehicleId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: 'quote', // default quote
        totalAmount: 120.00, // standard rate
        depositStatus: 'pending',
        createdAt: new Date().toISOString()
      });
      setIsAddingNew(false);
    } catch (e) {
      console.error(e);
      alert('Failed to spawn reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (data: any[]) => {
    if (!db) return;
    let importedCount = 0;
    for (const row of data) {
      if (row.customerId && row.vehicleId && row.startDate && row.endDate) {
        try {
          await addDoc(collection(db, 'reservations'), {
            customerId: row.customerId,
            vehicleId: row.vehicleId,
            startDate: new Date(row.startDate).toISOString(),
            endDate: new Date(row.endDate).toISOString(),
            status: row.status || 'quote',
            totalAmount: parseFloat(row.totalAmount) || 120.00,
            depositStatus: row.depositStatus || 'pending',
            createdAt: new Date().toISOString()
          });
          importedCount++;
        } catch (e) {
          console.error("Error importing reservation", e);
        }
      }
    }
    alert(`Successfully imported ${importedCount} reservations from CSV.`);
  };

  const handleOpenEdit = (res: any) => {
    setEditingReservation(res);
    setEditCustomerId(res.customerId || '');
    setEditVehicleId(res.vehicleId || '');
    
    // Format dates to YYYY-MM-DDTHH:MM for inputs
    const rawStart = res.startDate?.toDate ? res.startDate.toDate() : (res.startDate ? new Date(res.startDate) : null);
    const rawEnd = res.endDate?.toDate ? res.endDate.toDate() : (res.endDate ? new Date(res.endDate) : null);
    
    setEditStartDate(rawStart ? new Date(rawStart.getTime() - rawStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditEndDate(rawEnd ? new Date(rawEnd.getTime() - rawEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditStatus(res.status || 'quote');
  };

  const handleUpdateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReservation) return;

    try {
      await updateDoc(doc(db, 'reservations', editingReservation.id), {
        customerId: editCustomerId,
        vehicleId: editVehicleId,
        startDate: new Date(editStartDate).toISOString(),
        endDate: new Date(editEndDate).toISOString(),
        status: editStatus
      });
      setEditingReservation(null);
    } catch (e) {
      console.error("Failed to update reservation:", e);
      alert("Error saving reservation modifications.");
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reservation from the tracking log? This action is immediate.")) return;
    try {
      await deleteDoc(doc(db, 'reservations', id));
    } catch (e) {
      console.error("Failed to delete booking:", e);
      alert("Failed to delete reservation.");
    }
  };

  const renderDate = (field: any) => {
    if (!field) return 'N/A';
    if (field.toDate) {
      return new Date(field.toDate()).toLocaleDateString();
    }
    return new Date(field).toLocaleDateString();
  };

  const filteredReservations = reservations.filter(res => {
    const cust = customers.find(c => c.id === res.customerId);
    const name = cust ? `${cust.firstName} ${cust.lastName}` : '';
    const email = cust ? cust.email : '';
    const status = res.status || '';

    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      status.toLowerCase().includes(search.toLowerCase()) ||
      res.id.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (isAddingNew) {
    return (
      <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">New Rental</h1>
            <p className="text-zinc-500 text-sm mt-1">Initiate a new vehicle lease record.</p>
          </div>
          <button 
            onClick={() => setIsAddingNew(false)}
            className="text-[10px] uppercase font-black tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-8 rounded-2xl space-y-6">
          <div className="space-y-4 border-b border-[#27272a] pb-6">
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Client Assignment</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">Select Existing Contact</label>
                <select 
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500/50"
                >
                  <option value="">-- Choose Client --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase font-black px-2 pb-3 text-center">OR</p>
              <button 
                onClick={() => setView('contacts-customers')}
                className="px-6 py-3 bg-zinc-900 border border-[#27272a] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-blue-500/50 hover:bg-[#111113] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add New Contact
              </button>
            </div>
          </div>

          <div className="space-y-4 pb-6 border-b border-[#27272a]">
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Asset Selection</h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">Select Vehicle</label>
              <select 
                value={selectedVehicleId}
                onChange={e => setSelectedVehicleId(e.target.value)}
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500/50"
              >
                <option value="">-- Choose Vehicle --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber || 'No Plate'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Lease Duration</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">Start Date</label>
                  <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">End Date</label>
                  <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500/50" />
                </div>
             </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleCreateReservation} 
              disabled={loading}
              className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.05)] disabled:opacity-50"
            >
              {loading ? "Processing..." : "Create Rental"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const resStatusColors: Record<string, string> = {
    quote: 'bg-zinc-800 text-zinc-400 border border-zinc-700/50',
    confirmed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    active: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    completed: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    cancelled: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Rentals</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage ongoing bookings, statuses, and digital lease contracts.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsAddingNew(true)}
            className="px-4 py-2 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Plus size={14} /> New Record
          </button>
          <CSVImporter onImport={handleImport} label="Import" />
        </div>
      </div>

      <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search reservations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#111113]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">RES ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Client / Contact</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Asset</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Duration</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    Syncing reservation records...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No active reservations matching query.
                  </td>
                </tr>
              ) : (
                filteredReservations.map(res => {
                  const matchedCustomer = customers.find(c => c.id === res.customerId);
                  const matchedVehicle = vehicles.find(v => v.id === res.vehicleId);

                  return (
                    <tr key={res.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-xs font-mono font-bold text-white uppercase">
                        #{res.id.slice(0, 6).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-white">
                          {matchedCustomer ? `${matchedCustomer.firstName} ${matchedCustomer.lastName}` : 'Unknown Client'}
                        </p>
                        <p className="text-[10px] text-zinc-500">{matchedCustomer?.email || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-white">
                          {matchedVehicle ? `${matchedVehicle.make} ${matchedVehicle.model}` : 'Unknown Asset'}
                        </p>
                        <p className="text-[10px] text-blue-400 font-black">{matchedVehicle?.plateNumber || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-zinc-300">
                          {renderDate(res.startDate)} - {renderDate(res.endDate)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border",
                          resStatusColors[res.status] || resStatusColors.quote
                        )}>
                          {res.status || 'quote'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenEdit(res)}
                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" 
                            title="Edit Reservation"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteReservation(res.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/15 rounded transition-colors" 
                            title="Purge Reservation"
                          >
                            <Trash2 size={13} />
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

      {/* Editing Modal */}
      {editingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-[#27272a] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setEditingReservation(null)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-4">
              Edit Rental
            </h3>

            <form onSubmit={handleUpdateReservation} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Assigned Client</label>
                <select 
                  value={editCustomerId}
                  onChange={e => setEditCustomerId(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Assigned Vehicle Asset</label>
                <select 
                  value={editVehicleId}
                  onChange={e => setEditVehicleId(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  required
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plateNumber || 'No Plate'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Lease Start</label>
                  <input 
                    type="datetime-local" 
                    value={editStartDate} 
                    onChange={e => setEditStartDate(e.target.value)} 
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Lease End</label>
                  <input 
                    type="datetime-local" 
                    value={editEndDate} 
                    onChange={e => setEditEndDate(e.target.value)} 
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none" 
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Lease Status</label>
                <select 
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                >
                  <option value="quote">Quote Only</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active (Rented)</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingReservation(null)}
                  className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-wider"
                >
                  Apply Contract Edits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
