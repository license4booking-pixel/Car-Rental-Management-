import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, MapPin, Hash, User, Edit2, Trash2, X, FileText, Download } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc, getDocs, where, getDoc } from 'firebase/firestore';
import CSVImporter from './CSVImporter';
import { cn } from '../lib/utils';
import RentalAgreement from './RentalAgreement';
import { generateAndStoreAgreementPDF } from '../pdfGenerator';
import { useNotifications } from '../context/NotificationContext';
import { motion, useAnimation } from 'motion/react';

export default function ReservationManagement({ setView }: { setView: (v: string) => void }) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Core lookups
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  // Search/Filters
  const [search, setSearch] = useState('');

  // Edit Customer search state
  const [editCustomerSearchInput, setEditCustomerSearchInput] = useState('');
  const [showEditCustomerDropdown, setShowEditCustomerDropdown] = useState(false);

  // New Reservation State
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
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

  // Advanced details state
  const [selectedResDetails, setSelectedResDetails] = useState<any | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState<number>(0);
  
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

    const handleOpenNew = (e: any) => {
      if (e.detail === 'reservation') setIsAddingNew(true);
    };
    window.addEventListener('open-new-record', handleOpenNew);

    return () => {
      unsubRes();
      unsubCust();
      unsubVeh();
      window.removeEventListener('open-new-record', handleOpenNew);
    };
  }, [db]);

  const handleCreateReservation = async () => {
    if (!selectedCustomerId || !selectedVehicleId || !startDate || !endDate) {
      alert("Missing required fields");
      return;
    }
    
    // Calculate total amount based on vehicle daily rate
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    let calculatedAmount = 120.00;
    
    try {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      calculatedAmount = (vehicle?.dailyRate || 120.00) * diffDays;
    } catch(err) {
      console.warn("Date calculation err", err);
    }
    
    try {
      setLoading(true);
      const resRef = await addDoc(collection(db, 'reservations'), {
        customerId: selectedCustomerId,
        vehicleId: selectedVehicleId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status: 'quote', // default quote
        totalAmount: calculatedAmount,
        depositStatus: 'pending',
        createdAt: new Date().toISOString()
      });
      
      // Also generate a pending invoice to show in the finance / dashboard metrics
      await addDoc(collection(db, 'rental_payments'), {
        customerId: selectedCustomerId,
        rentalId: resRef.id,
        amount: calculatedAmount,
        status: 'pending',
        description: `Rental amount calculated based on ${vehicle?.dailyRate || 120}/day`,
        date: new Date()
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
          const status = row.status || 'quote';
          await addDoc(collection(db, 'reservations'), {
            customerId: row.customerId,
            vehicleId: row.vehicleId,
            startDate: new Date(row.startDate).toISOString(),
            endDate: new Date(row.endDate).toISOString(),
            status: status,
            totalAmount: parseFloat(row.totalAmount) || 120.00,
            depositStatus: row.depositStatus || 'pending',
            createdAt: new Date().toISOString()
          });
          if (status === 'confirmed' || status === 'active') {
            await updateDoc(doc(db, 'vehicles', row.vehicleId), { status: 'rented' });
          }
          importedCount++;
        } catch (e) {
          console.error("Error importing reservation", e);
        }
      }
    }
    alert(`Successfully imported ${importedCount} reservations from CSV.`);
  };

  const { simulateNotification } = useNotifications();

  const handleOpenEdit = (res: any) => {
    setEditingReservation(res);
    setEditCustomerId(res.customerId || '');
    const matchedCustomer = customers.find(c => c.id === res.customerId);
    if (matchedCustomer) {
      setEditCustomerSearchInput(`${matchedCustomer.firstName} ${matchedCustomer.lastName}`);
    } else {
      setEditCustomerSearchInput('');
    }
    setEditVehicleId(res.vehicleId || '');
    
    // Format dates to YYYY-MM-DDTHH:MM for inputs
    const rawStart = res.startDate?.toDate ? res.startDate.toDate() : (res.startDate ? new Date(res.startDate) : null);
    const rawEnd = res.endDate?.toDate ? res.endDate.toDate() : (res.endDate ? new Date(res.endDate) : null);
    
    setEditStartDate(rawStart ? new Date(rawStart.getTime() - rawStart.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditEndDate(rawEnd ? new Date(rawEnd.getTime() - rawEnd.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditStatus(res.status || 'quote');
  };

  const quickMarkPayment = async (rentalId: string, status: 'paid' | 'pending') => {
    if (!db) return;
    try {
      const q = query(collection(db, 'rental_payments'), where('rentalId', '==', rentalId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(doc(db, 'rental_payments', snap.docs[0].id), { status });
        await addDoc(collection(db, 'activity_logs'), {
          user: 'John (Staff)',
          details: `Swipe action: Marked payment as ${status.toUpperCase()} for rental #${rentalId.slice(0, 8)}`,
          timestamp: new Date().toISOString()
        });
        simulateNotification("Payment Updated", `Successfully marked invoice as ${status.toUpperCase()}.`, status === 'paid' ? 'success' as any : 'warning' as any, 'payment-rentals');
      } else {
        alert("No payment record found for this rental.");
      }
    } catch(e) {
      console.warn(e);
    }
  };

  const SwipeableCard = ({ res, matchedCustomer, matchedVehicle }: any) => {
    const controls = useAnimation();
    
    const handleDragEnd = async (event: any, info: any) => {
      const offset = info.offset.x;
      if (offset > 120) {
        await controls.start({ x: 300, transition: { duration: 0.2 } });
        quickMarkPayment(res.id, 'paid');
        controls.start({ x: 0, transition: { duration: 0.2 } });
      } else if (offset < -120) {
        await controls.start({ x: -300, transition: { duration: 0.2 } });
        quickMarkPayment(res.id, 'pending');
        controls.start({ x: 0, transition: { duration: 0.2 } });
      } else {
        controls.start({ x: 0 });
      }
    };

    return (
      <div className="relative overflow-hidden bg-zinc-900 border-b border-[#27272a] touch-pan-y">
         <div className="absolute inset-0 flex justify-between items-center px-6 font-bold text-[10px] uppercase tracking-widest text-white">
            <span className="text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded">💰 Mark Paid &rarr;</span>
            <span className="text-rose-400 bg-rose-500/10 px-3 py-1 rounded">&larr; Mark Unpaid ⛔</span>
         </div>
         <motion.div
           drag="x"
           dragConstraints={{ left: 0, right: 0 }}
           dragElastic={0.8}
           onDragEnd={handleDragEnd}
           animate={controls}
           className="relative bg-[#111113] p-4 cursor-grab active:cursor-grabbing hover:bg-white/[0.02]"
           onClick={() => handleOpenDetails(res)}
         >
           <div className="flex justify-between items-start mb-2">
             <span className="text-xs font-mono font-bold text-white uppercase">#{res.id.slice(0, 6)}</span>
             <span className={cn(
                "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border",
                resStatusColors[res.status] || resStatusColors.quote
              )}>
                {res.status || 'quote'}
             </span>
           </div>
           
           <div className="space-y-1 mb-2">
             <p className="text-sm font-bold text-white">{matchedCustomer ? `${matchedCustomer.firstName} ${matchedCustomer.lastName}` : 'Unknown Client'}</p>
             <p className="text-[10px] text-zinc-500">{matchedVehicle ? `${matchedVehicle.make} ${matchedVehicle.model}` : 'Unknown Vehicle'} | {matchedVehicle?.plateNumber || 'N/A'}</p>
           </div>
           
           <p className="text-[10px] text-zinc-400 mt-2 border-t border-[#27272a] pt-2">
             {renderDate(res.startDate)} &rarr; {renderDate(res.endDate)}
           </p>
         </motion.div>
      </div>
    );
  };

  const handleUpdateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReservation) return;

    try {
      // Coordinate vehicle fleet status based on active rental status
      const oldVehicleId = editingReservation.vehicleId;
      const oldStatus = editingReservation.status;
      
      const statusBecameRented = (editStatus === 'confirmed' || editStatus === 'active');
      const statusWasRented = (oldStatus === 'confirmed' || oldStatus === 'active');

      if (oldVehicleId !== editVehicleId) {
        if (statusWasRented) {
          await updateDoc(doc(db, 'vehicles', oldVehicleId), { status: 'available' });
        }
        if (statusBecameRented) {
          await updateDoc(doc(db, 'vehicles', editVehicleId), { status: 'rented' });
        }
      } else {
        if (statusBecameRented && !statusWasRented) {
          await updateDoc(doc(db, 'vehicles', editVehicleId), { status: 'rented' });
        } else if (!statusBecameRented && statusWasRented) {
          await updateDoc(doc(db, 'vehicles', editVehicleId), { status: 'available' });
        }
      }

      await updateDoc(doc(db, 'reservations', editingReservation.id), {
        customerId: editCustomerId,
        vehicleId: editVehicleId,
        startDate: new Date(editStartDate).toISOString(),
        endDate: new Date(editEndDate).toISOString(),
        status: editStatus
      });

      // If status confirmed, try to generate PDF and upload it
      if (editStatus === 'confirmed' && !editingReservation.agreementUrl) {
         try {
           await generateAndStoreAgreementPDF(editingReservation.id);
         } catch (pdfErr) {
           console.error("PDF generation failed:", pdfErr);
         }
      }

      setEditingReservation(null);
    } catch (e) {
      console.error("Failed to update reservation:", e);
      alert("Error saving reservation modifications.");
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reservation from the tracking log? This action is immediate.")) return;
    try {
      if (db) {
        const resSnap = await getDoc(doc(db, 'reservations', id));
        if (resSnap.exists()) {
          const resData = resSnap.data();
          if ((resData.status === 'confirmed' || resData.status === 'active') && resData.vehicleId) {
            await updateDoc(doc(db, 'vehicles', resData.vehicleId), { status: 'available' });
          }
        }
      }
      await deleteDoc(doc(db, 'reservations', id));
    } catch (e) {
      console.error("Failed to delete booking:", e);
      alert("Failed to delete reservation.");
    }
  };

  const handleOpenDetails = async (res: any) => {
    setSelectedResDetails(res);
    setDepositAmountInput(res.depositAmount || 0);
    // fetch payment info
    if (!db) return;
    try {
      const q = query(collection(db, 'rental_payments'), where('rentalId', '==', res.id));
      const pSnap = await getDocs(q);
      if (!pSnap.empty) {
        setPaymentInfo({ id: pSnap.docs[0].id, ...pSnap.docs[0].data() });
      } else {
        setPaymentInfo(null);
      }
    } catch(e) {
      console.warn(e);
    }
  };

  const handleMarkPayment = async (status: 'paid' | 'pending') => {
    if (!db || !paymentInfo || !selectedResDetails) return;
    try {
      await updateDoc(doc(db, 'rental_payments', paymentInfo.id), { status });
      setPaymentInfo({ ...paymentInfo, status });
      
      await addDoc(collection(db, 'activity_logs'), {
          user: 'John (Staff)',
          details: `Marked payment as ${status.toUpperCase()} for rental #${selectedResDetails.id.slice(0, 8)}`,
          timestamp: new Date().toISOString()
      });
    } catch (e) { console.error(e); }
  };

  const handleUpdateDeposit = async () => {
    if (!db || !selectedResDetails) return;
    try {
      await updateDoc(doc(db, 'reservations', selectedResDetails.id), {
        depositAmount: depositAmountInput,
        depositStatus: depositAmountInput > 0 ? 'paid' : 'pending'
      });
      setSelectedResDetails({ ...selectedResDetails, depositAmount: depositAmountInput, depositStatus: depositAmountInput > 0 ? 'paid' : 'pending' });
      await addDoc(collection(db, 'activity_logs'), {
          user: 'John (Staff)',
          details: `Updated advance deposit to $${depositAmountInput} for rental #${selectedResDetails.id.slice(0,8)}`,
          timestamp: new Date().toISOString()
      });
    } catch (e) { console.error(e); }
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

  const [selectedResForAgreement, setSelectedResForAgreement] = useState<any>(null);

  if (selectedResForAgreement) {
    return <RentalAgreement reservationId={selectedResForAgreement.id} onBack={() => setSelectedResForAgreement(null)} />;
  }

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
              <div className="flex-1 space-y-1.5 relative">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">Search Contact (Min 2 chars)</label>
                <input 
                  type="text"
                  placeholder="Type customer name..."
                  value={customerSearchInput}
                  onChange={e => {
                    setCustomerSearchInput(e.target.value);
                    if (e.target.value.length >= 2) setShowCustomerDropdown(true);
                    else {
                      setShowCustomerDropdown(false);
                      if (e.target.value === '') setSelectedCustomerId('');
                    }
                  }}
                  onFocus={() => {
                    if (customerSearchInput.length >= 2) setShowCustomerDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500/50"
                />
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#111113] border border-[#27272a] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {customers
                      .filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(customerSearchInput.toLowerCase()) || c.email?.toLowerCase().includes(customerSearchInput.toLowerCase()))
                      .map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerSearchInput(`${c.firstName} ${c.lastName}`);
                            setShowCustomerDropdown(false);
                          }}
                          className="px-4 py-3 hover:bg-[#18181b] cursor-pointer text-xs transition-colors border-b border-[#27272a] last:border-0 flex justify-between items-center group"
                        >
                          <span className="font-bold text-white uppercase group-hover:text-blue-400">{c.firstName} {c.lastName}</span>
                          <span className="text-zinc-500 font-mono text-[9px]">{c.email}</span>
                        </div>
                      ))}
                    {customers.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(customerSearchInput.toLowerCase()) || c.email?.toLowerCase().includes(customerSearchInput.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-xs text-zinc-500 italic">No exact matches found.</div>
                    )}
                  </div>
                )}
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
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Vehicle Selection</h3>
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

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#111113]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">RES ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Client / Contact</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Vehicle</th>
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
                    <tr onClick={() => handleOpenDetails(res)} key={res.id} className="hover:bg-white/[0.04] transition-colors group cursor-pointer">
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
                          {matchedVehicle ? `${matchedVehicle.make} ${matchedVehicle.model}` : 'Unknown Vehicle'}
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
                          {res.agreementUrl && (
                            <a 
                              onClick={e => e.stopPropagation()}
                              href={res.agreementUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded transition-colors relative z-10"
                              title="Download Signed PDF Agreement"
                            >
                              <Download size={13} />
                            </a>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedResForAgreement(res); }}
                            className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors relative z-10"
                            title="View Agreement Details"
                          >
                            <FileText size={13} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(res); }}
                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors relative z-10" 
                            title="Edit Reservation"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteReservation(res.id); }}
                            className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/15 rounded transition-colors relative z-10" 
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
        
        {/* Mobile List View */}
        <div className="md:hidden">
           {loading ? (
             <div className="p-8 text-center text-zinc-500">
               <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
               Syncing reservation records...
             </div>
           ) : filteredReservations.length === 0 ? (
             <div className="p-8 text-center text-zinc-500 text-sm">
                No active reservations matching query.
             </div>
           ) : (
             filteredReservations.map(res => {
               const matchedCustomer = customers.find(c => c.id === res.customerId);
               const matchedVehicle = vehicles.find(v => v.id === res.vehicleId);
               return <SwipeableCard key={res.id} res={res} matchedCustomer={matchedCustomer} matchedVehicle={matchedVehicle} />;
             })
           )}
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
              <div className="space-y-1 relative">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Search Client (Min 2 chars)</label>
                <input 
                  type="text"
                  placeholder="Type customer name..."
                  value={editCustomerSearchInput}
                  onChange={e => {
                    setEditCustomerSearchInput(e.target.value);
                    if (e.target.value.length >= 2) setShowEditCustomerDropdown(true);
                    else {
                      setShowEditCustomerDropdown(false);
                      if (e.target.value === '') setEditCustomerId('');
                    }
                  }}
                  onFocus={() => {
                    if (editCustomerSearchInput.length >= 2) setShowEditCustomerDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowEditCustomerDropdown(false), 200)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  required
                />
                {showEditCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#111113] border border-[#27272a] rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {customers
                      .filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(editCustomerSearchInput.toLowerCase()) || c.email?.toLowerCase().includes(editCustomerSearchInput.toLowerCase()))
                      .map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => {
                            setEditCustomerId(c.id);
                            setEditCustomerSearchInput(`${c.firstName} ${c.lastName}`);
                            setShowEditCustomerDropdown(false);
                          }}
                          className="px-4 py-3 hover:bg-[#18181b] cursor-pointer text-xs transition-colors border-b border-[#27272a] last:border-0 flex justify-between items-center group"
                        >
                          <span className="font-bold text-white uppercase group-hover:text-blue-400">{c.firstName} {c.lastName}</span>
                          <span className="text-zinc-500 font-mono text-[9px]">{c.email}</span>
                        </div>
                      ))}
                    {customers.filter(c => (c.firstName + ' ' + c.lastName).toLowerCase().includes(editCustomerSearchInput.toLowerCase()) || c.email?.toLowerCase().includes(editCustomerSearchInput.toLowerCase())).length === 0 && (
                      <div className="px-4 py-3 text-xs text-zinc-500 italic">No exact matches found.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Assigned Vehicle</label>
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

      {selectedResDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-[#27272a] p-6 rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setSelectedResDetails(null)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-4 border-b border-[#27272a] pb-4">
              Rental Record <span className="text-zinc-500 font-mono text-sm ml-2">#{selectedResDetails.id.slice(0, 8)}</span>
            </h3>

            <div className="overflow-y-auto pr-2 space-y-6">
              {/* Renter Details */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Renter Profile</h4>
                {(() => {
                  const cust = customers.find(c => c.id === selectedResDetails.customerId);
                  if (!cust) return <p className="text-sm text-zinc-400 font-mono">Unknown Client</p>;
                  return (
                    <div className="bg-[#18181b] p-4 rounded-xl border border-[#27272a] space-y-1">
                      <p className="text-sm font-bold text-white uppercase">{cust.firstName} {cust.lastName}</p>
                      <p className="text-xs text-zinc-500 font-mono">{cust.email}</p>
                      <p className="text-xs text-zinc-500 font-mono">{cust.phone}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Vehicle Details */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Vehicle</h4>
                {(() => {
                  const veh = vehicles.find(v => v.id === selectedResDetails.vehicleId);
                  if (!veh) return <p className="text-sm text-zinc-400 font-mono">Unknown Vehicle</p>;
                  return (
                    <div className="bg-[#18181b] p-4 rounded-xl border border-[#27272a] space-y-1">
                      <p className="text-sm font-bold text-white uppercase">{veh.make} {veh.model} ({veh.year || 'N/A'})</p>
                      <div className="flex gap-4 mt-2">
                        <p className="text-xs text-zinc-500 font-mono">VIN: {veh.vin}</p>
                        <p className="text-xs text-blue-400 font-mono font-black border border-blue-500/20 bg-blue-500/10 px-1 rounded">{veh.plateNumber || 'N/A'}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              {/* Timing */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Allocation Window</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                    <p className="text-[10px] font-black text-zinc-600 uppercase">Commencement</p>
                    <p className="text-xs font-mono text-zinc-300 mt-1">{new Date(selectedResDetails.startDate?.toDate ? selectedResDetails.startDate.toDate() : selectedResDetails.startDate).toLocaleString()}</p>
                  </div>
                  <div className="bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                    <p className="text-[10px] font-black text-zinc-600 uppercase">Termination</p>
                    <p className="text-xs font-mono text-zinc-300 mt-1">{new Date(selectedResDetails.endDate?.toDate ? selectedResDetails.endDate.toDate() : selectedResDetails.endDate).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Status and Financials */}
              <div className="space-y-4 pt-4 border-t border-[#27272a]">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Invoice Status</h4>
                  {paymentInfo ? (
                    <span className={cn(
                      "px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border",
                      paymentInfo.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    )}>
                      {paymentInfo.status || 'pending'}
                    </span>
                  ) : <span className="text-xs text-zinc-500 font-mono italic">No invoice linked</span>}
                </div>
                
                {paymentInfo && (
                  <div className="flex justify-start gap-3">
                    <button 
                      onClick={() => handleMarkPayment('paid')}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      Mark as PAID
                    </button>
                    <button 
                      onClick={() => handleMarkPayment('pending')}
                      className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      Mark as UNPAID
                    </button>
                  </div>
                )}
              </div>

              {/* Deposit section */}
              <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Advance Security Deposit</h4>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">$</span>
                    <input 
                      type="number"
                      value={depositAmountInput}
                      onChange={e => setDepositAmountInput(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-8 pr-3 py-2 text-sm font-mono text-white focus:border-blue-500/50 outline-none"
                    />
                  </div>
                  <button 
                    onClick={handleUpdateDeposit}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold uppercase transition-colors tracking-wider"
                  >
                    Save Deposit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
