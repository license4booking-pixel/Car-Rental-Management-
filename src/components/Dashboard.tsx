import React from 'react';
import { 
  BarChart3, 
  Car, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Zap,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { useNotifications } from '../context/NotificationContext';
import { NotificationType } from '../services/notificationService';

const data = [
  { name: 'Mon', revenue: 0, bookings: 0 },
  { name: 'Tue', revenue: 0, bookings: 0 },
  { name: 'Wed', revenue: 0, bookings: 0 },
  { name: 'Thu', revenue: 0, bookings: 0 },
  { name: 'Fri', revenue: 0, bookings: 0 },
  { name: 'Sat', revenue: 0, bookings: 0 },
  { name: 'Sun', revenue: 0, bookings: 0 },
];

const StatCard = ({ label, value, trend, icon: Icon, color, onClick, valueColor, subtext }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className={cn(
      "bg-[#09090b] border border-[#27272a] p-6 rounded-xl relative overflow-hidden group hover:border-zinc-700 transition-colors",
      onClick ? "cursor-pointer" : ""
    )}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2.5 rounded-lg bg-zinc-900 border border-[#27272a] text-zinc-400 group-hover:text-white transition-colors")}>
        <Icon className="w-5 h-5" />
      </div>
      <button className="text-zinc-600 hover:text-white transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
    <div>
      <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-3">
        <h3 className={cn("text-2xl font-bold tracking-tight tabular-nums", valueColor ? valueColor : "text-[#fafafa]")}>{value}</h3>
        {trend !== undefined && (
          <span className={cn("text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-md", trend > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10")}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {subtext && (
        <p className="text-[9px] text-zinc-500 font-mono mt-2">{subtext}</p>
      )}
    </div>
  </motion.div>
);

import { db } from '../firebase';
import { collection, query, getDocs, limit, onSnapshot, where, doc, updateDoc, addDoc, orderBy, getDoc, deleteDoc, setDoc } from 'firebase/firestore';

export default function Dashboard({ setView }: { setView?: (v: string) => void }) {
  const { simulateNotification } = useNotifications();

  const [totalRevenue, setTotalRevenue] = React.useState(0);
  const [totalUnpaidAmt, setTotalUnpaidAmt] = React.useState(0);
  const [activeRentals, setActiveRentals] = React.useState(0);
  const [reservationsNext24h, setReservationsNext24h] = React.useState(0);
  const [fleetAvailability, setFleetAvailability] = React.useState<{available: number, total: number}>({available: 0, total: 0});
  const [unpaidInvoices, setUnpaidInvoices] = React.useState(0);
  const [totalCustomers, setTotalCustomers] = React.useState(0);
  const [chartData, setChartData] = React.useState(data);

  const [activeRentalsData, setActiveRentalsData] = React.useState<any[]>([]);
  const [unpaidData, setUnpaidData] = React.useState<any[]>([]);
  const [paidData, setPaidData] = React.useState<any[]>([]);
  const [billingTab, setBillingTab] = React.useState<'unpaid' | 'paid'>('unpaid');
  const [maintenanceData, setMaintenanceData] = React.useState<any[]>([]);
  const [availableData, setAvailableData] = React.useState<any[]>([]);
  const [customerMap, setCustomerMap] = React.useState<Record<string, any>>({});
  const [reservationsMap, setReservationsMap] = React.useState<Record<string, any>>({});
  const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
  const [activeModal, setActiveModal] = React.useState<string | null>(null);
  const [weeklyRentedCount, setWeeklyRentedCount] = React.useState(0);
  const [rawReservations, setRawReservations] = React.useState<any[]>([]);
  const [rawPayments, setRawPayments] = React.useState<any[]>([]);
  const [rawVehicles, setRawVehicles] = React.useState<any[]>([]);
  const [rawCustomers, setRawCustomers] = React.useState<any[]>([]);

  // Fetch real-time metrics
  React.useEffect(() => {
    if (!db) return;

    // Activity Logs
    const qLogs = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(5));
    const unLogs = onSnapshot(qLogs, (snap) => {
      setActivityLogs(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    // Reservations Map
    const unResMap = onSnapshot(collection(db, 'reservations'), (snap) => {
      const rmap: Record<string, any> = {};
      const list: any[] = [];
      snap.forEach(d => {
        rmap[d.id] = d.data();
        list.push({ id: d.id, ...d.data() });
      });
      setReservationsMap(rmap);
      setRawReservations(list);
    });

    // Active Rentals
    const qRents = query(collection(db, 'reservations'), where('status', '==', 'active'));
    const unRents = onSnapshot(qRents, (snap) => {
      setActiveRentalsData(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    // Maintenance Vehicles
    const qMaint = query(collection(db, 'vehicles'), where('status', '==', 'maintenance'));
    const unMaint = onSnapshot(qMaint, (snap) => {
      setMaintenanceData(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    // Fleet Availability
    const unFleet = onSnapshot(collection(db, 'vehicles'), (snap) => {
      let availableCount = 0;
      let rentedCount = 0;
      let total = snap.size;
      const avList: any[] = [];
      const allVehicles: any[] = [];
      snap.forEach(doc => {
        const vData = doc.data();
        allVehicles.push({ id: doc.id, ...vData });
        if (vData.status === 'available') {
           availableCount++;
           avList.push({ id: doc.id, ...vData });
        } else if (vData.status === 'rented') {
           rentedCount++;
        }
      });
      setFleetAvailability({ available: availableCount, total });
      setAvailableData(avList);
      setRawVehicles(allVehicles);
    });

    // Total Customers
    const unCust = onSnapshot(collection(db, 'customers'), (snap) => {
      setTotalCustomers(snap.size);
      const cmap: Record<string, any> = {};
      const list: any[] = [];
      snap.forEach(d => {
        cmap[d.id] = d.data();
        list.push({ id: d.id, ...d.data() });
      });
      setCustomerMap(cmap);
      setRawCustomers(list);
    });

    // Total Revenue (From payments) & Unpaid
    const unPayments = onSnapshot(collection(db, 'rental_payments'), (snap) => {
      let rev = 0;
      let unpaid = 0;
      let unpaidSum = 0;
      const unpaidList: any[] = [];
      const paidList: any[] = [];
      const allPayments: any[] = [];
      snap.forEach(d => {
        const val = parseFloat(d.data().amount);
        const status = d.data().status;
        allPayments.push({ id: d.id, ...d.data() });
        if (!isNaN(val) && (status === 'paid' || status === 'completed')) {
          rev += val;
          paidList.push({ id: d.id, ...d.data() });
        }
        if (status === 'pending' || !status) {
          unpaid++;
          if (!isNaN(val)) {
            unpaidSum += val;
            unpaidList.push({ id: d.id, ...d.data() });
          }
        }
      });
      setTotalRevenue(rev);
      setUnpaidData(unpaidList);
      setPaidData(paidList);
      setRawPayments(allPayments);
    });

    return () => {
      unLogs();
      unResMap();
      unRents();
      unMaint();
      unFleet();
      unCust();
      unPayments();
    };
  }, []);

  React.useEffect(() => {
    const days = [
      { name: 'Mon', revenue: 0, bookings: 0 },
      { name: 'Tue', revenue: 0, bookings: 0 },
      { name: 'Wed', revenue: 0, bookings: 0 },
      { name: 'Thu', revenue: 0, bookings: 0 },
      { name: 'Fri', revenue: 0, bookings: 0 },
      { name: 'Sat', revenue: 0, bookings: 0 },
      { name: 'Sun', revenue: 0, bookings: 0 },
    ];

    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const rentedVehicleInWeekIds = new Set<string>();

    rawReservations.forEach((res) => {
      if (res.status === 'active' || res.status === 'confirmed' || res.status === 'completed') {
        const start = res.startDate ? new Date(res.startDate) : null;
        const end = res.endDate ? new Date(res.endDate) : null;
        if (start && end) {
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            const checkDayStart = new Date(dayDate);
            checkDayStart.setHours(0, 0, 0, 0);
            const checkDayEnd = new Date(dayDate);
            checkDayEnd.setHours(23, 59, 59, 999);

            if (start <= checkDayEnd && end >= checkDayStart) {
              days[i].bookings += 1;
            }
          }
        }

        if (start && start >= monday && start <= sunday && res.vehicleId) {
          rentedVehicleInWeekIds.add(res.vehicleId);
        }
      }
    });

    rawVehicles.forEach(v => {
      if (v.status === 'rented' && v.id) {
        rentedVehicleInWeekIds.add(v.id);
      }
    });

    setWeeklyRentedCount(rentedVehicleInWeekIds.size);

    rawPayments.forEach((pay) => {
      const amt = parseFloat(pay.amount);
      if (!isNaN(amt) && (pay.status === 'paid' || pay.status === 'completed')) {
        const pDate = pay.date ? (pay.date.toDate ? pay.date.toDate() : new Date(pay.date)) : null;
        if (pDate && pDate >= monday && pDate <= sunday) {
          const dayIdx = pDate.getDay();
          const idx = dayIdx === 0 ? 6 : dayIdx - 1;
          if (idx >= 0 && idx < 7) {
            days[idx].revenue += amt;
          }
        }
      }
    });

    // Central analytical calculations as requested by system rules
    let activeRentalsCount = 0;
    let unpaidCount = 0;
    let outstandingTotal = 0;

    rawCustomers.forEach((c) => {
      if (c.status === 'Active Renter') {
        activeRentalsCount++;
      }
      if (c.paymentStatus === 'Unpaid') {
        unpaidCount++;
        const amt = parseFloat(c.amountDue) || 0;
        outstandingTotal += amt;
      }
    });

    setActiveRentals(activeRentalsCount);
    setUnpaidInvoices(unpaidCount);
    setTotalUnpaidAmt(outstandingTotal);

    setChartData(days);
  }, [rawReservations, rawPayments, rawVehicles, rawCustomers]);

  const markAsPaid = async (paymentId: string, rentalId?: string) => {
    if (!db) return;
    try {
      if (paymentId.startsWith('cust_unpaid_')) {
        const customerId = paymentId.replace('cust_unpaid_', '');
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
          await deleteDoc(doc(db, 'rental_payments', paymentId));
          await setDoc(doc(db, 'rental_payments', 'cust_paid_' + customerId), {
            customerId,
            customerName: `${custData.firstName} ${custData.lastName}`,
            amount: currentPaid + currentDue,
            status: 'paid',
            description: `Total Amount Paid by ${custData.firstName} ${custData.lastName} (Synced)`,
            date: new Date()
          });
        }
      } else {
        await updateDoc(doc(db, 'rental_payments', paymentId), { status: 'paid' });
      }

      simulateNotification("Payment Marked", "Successfully marked invoice as PAID.", NotificationType.SUCCESS, 'payment-rentals');
      await addDoc(collection(db, 'activity_logs'), {
          user: 'John (Staff)',
          details: `Marked payment complete for rental #${rentalId?.slice(0, 8) || paymentId.slice(0,8)}`,
          timestamp: new Date().toISOString()
      });
    } catch(e) { console.error(e); }
  };

  const markAsUnpaid = async (paymentId: string, rentalId?: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'rental_payments', paymentId), { status: 'pending' });
      simulateNotification("Payment Marked", "Successfully marked invoice as UNPAID.", NotificationType.WARNING, 'payment-rentals');
      await addDoc(collection(db, 'activity_logs'), {
          user: 'John (Staff)',
          details: `Marked payment as UNPAID for rental #${rentalId?.slice(0, 8) || paymentId.slice(0,8)}`,
          timestamp: new Date().toISOString()
      });
    } catch(e) { console.error(e); }
  };

  const markAsAvailable = async (vehicle: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'vehicles', vehicle.id), { status: 'available' });
      simulateNotification("Vehicle Available", "Vehicle marked as available.", NotificationType.SUCCESS, 'fleet-inventory');
      await addDoc(collection(db, 'activity_logs'), {
          user: 'John (Staff)',
          details: `${vehicle.make} ${vehicle.model} was marked available`,
          timestamp: new Date().toISOString()
      });
    } catch(e) { console.error(e); }
  };

  const triggers = [
    { label: 'Fuel Warning', desc: 'Notify low fuel in V-442', type: NotificationType.WARNING, title: 'Low Fuel Alert', msg: 'Vehicle V-442 (Tesla Model 3) fuel level dropped below 10%. Immediate charging required.' },
    { label: 'Maint Finish', desc: 'Maintenance complete V-109', type: NotificationType.SUCCESS, title: 'Maintenance Completed', msg: 'Vehicle V-109 is now back in service after successful inspection.' },
    { label: 'Overdue Unit', desc: 'Alert overdue return V-77', type: NotificationType.CRITICAL, title: 'Overdue Return', msg: 'Reservation #99201 is overdue by 4 hours. Customer contact initiated.' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-zinc-500 text-sm mt-1">Operational readiness and fleet intelligence.</p>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard 
          label="Active Rentals" 
          value={activeRentals} 
          icon={Car} 
          onClick={() => setActiveModal('active-rentals')}
        />
        <StatCard 
          label="Unpaid Invoices" 
          value={unpaidInvoices} 
          icon={Clock} 
          onClick={() => { setActiveModal('unpaid-rentals'); setBillingTab('unpaid'); }} 
        />
        <StatCard 
          label="Outstanding Invoices" 
          value={`$${totalUnpaidAmt.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          icon={AlertCircle} 
          onClick={() => { setActiveModal('unpaid-rentals'); setBillingTab('unpaid'); }} 
          valueColor="text-rose-400" 
        />
        <StatCard 
          label="Total Paid Rentals" 
          value={`$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          icon={TrendingUp} 
          onClick={() => { setActiveModal('unpaid-rentals'); setBillingTab('paid'); }} 
          valueColor="text-[#10b981]" 
        />
        <StatCard 
          label="On Repair Vehicles" 
          value={maintenanceData.length} 
          icon={AlertCircle} 
          onClick={() => setActiveModal('maintenance-vehicles')} 
          valueColor="text-rose-500" 
        />
        <StatCard 
          label="Fleet Availability" 
          value={`${fleetAvailability.available} / ${fleetAvailability.total}`} 
          icon={BarChart3} 
          onClick={() => setActiveModal('fleet-availability')} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[#09090b] border border-[#27272a] p-6 rounded-xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <h3 className="text-sm font-bold text-white uppercase tracking-wider">Revenue & Rental Stream</h3>
            </div>
            <select className="bg-zinc-900 border border-[#27272a] text-zinc-500 text-[10px] font-bold uppercase rounded px-2 py-1 outline-none hover:text-white transition-colors cursor-pointer">
              <option>WEEkLY_SNAPSHOT</option>
              <option>MONTHLY_DATA</option>
            </select>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10, fontWeight: 600 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#3b82f6', fontSize: 10, fontWeight: 600 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#a855f7', fontSize: 10, fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area yAxisId="right" type="monotone" dataKey="bookings" name="Rented Vehicles" stroke="#a855f7" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBookings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-[#09090b] border border-[#27272a] p-6 rounded-xl flex flex-col h-1/2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recent Activity</h3>
              <Clock size={14} className="text-zinc-500" />
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {activityLogs.length === 0 ? (
                 <p className="text-[10px] text-zinc-500 font-mono">No recent activity.</p>
              ) : (
                activityLogs.map((log: any) => (
                  <div key={log.id} className="text-sm border-b border-[#27272a] pb-3 last:border-0 last:pb-0">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{log.user}</p>
                    <p className="text-xs text-white mt-0.5">{log.details}</p>
                    <p className="text-[9px] text-zinc-500 mt-1.5 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="bg-[#09090b] border border-[#27272a] p-6 rounded-xl flex flex-col h-1/2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Notification Simulator</h3>
              <Zap size={14} className="text-blue-500" />
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {triggers.map((t, i) => (
                <button 
                  key={i} 
                  onClick={() => simulateNotification(t.title, t.msg, t.type)}
                  className="w-full text-left p-3 rounded-lg bg-[#111113] border border-[#27272a] hover:border-zinc-700 transition-all group"
                >
                  <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1 group-hover:text-blue-400 transition-colors">
                    {t.label}
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#09090b] border border-[#27272a] rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-[#27272a] bg-[#111113]">
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  {activeModal === 'active-rentals' && 'Active Rentals'}
                  {activeModal === 'unpaid-rentals' && 'Settlements & Invoices Directory'}
                  {activeModal === 'maintenance-vehicles' && 'On Repair Vehicles'}
                  {activeModal === 'fleet-availability' && 'Available Vehicles'}
                </h2>
                <button onClick={() => setActiveModal(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto space-y-4">
                {activeModal === 'fleet-availability' && availableData.map(v => (
                  <div key={v.id} className="bg-zinc-900 border border-[#27272a] p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white uppercase">{v.make} {v.model}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-1">VIN: {v.vin} | Rate: ${v.dailyRate}/day | Fuel: {v.fuelLevel}%</p>
                    </div>
                    <span className="px-3 py-1 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <Check size={12} /> Ready
                    </span>
                  </div>
                ))}
                {activeModal === 'fleet-availability' && availableData.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-8">No vehicles currently available.</p>
                )}
                {activeModal === 'maintenance-vehicles' && maintenanceData.map(v => (
                  <div key={v.id} className="bg-zinc-900 border border-[#27272a] p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">{v.make} {v.model}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-1">VIN: {v.vin} | System ID: {v.id.slice(0,8)}</p>
                    </div>
                    <button 
                      onClick={() => markAsAvailable(v)}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded text-xs font-bold transition-colors uppercase tracking-wider"
                    >
                      Mark Available
                    </button>
                  </div>
                ))}
                {activeModal === 'maintenance-vehicles' && maintenanceData.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-8">No vehicles currently on repair.</p>
                )}

                {activeModal === 'unpaid-rentals' && (
                  <div className="space-y-4">
                    <div className="flex bg-[#111113] p-1 rounded-lg border border-[#27272a] mb-4">
                      <button
                        type="button"
                        onClick={() => setBillingTab('unpaid')}
                        className={cn(
                          "flex-1 py-1.5 px-3 text-[10px] uppercase font-black tracking-wider rounded transition-all",
                          billingTab === 'unpaid' ? "bg-white text-black font-black font-mono" : "text-zinc-500 hover:text-white"
                        )}
                      >
                        Outstanding Unpaid ({unpaidData.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingTab('paid')}
                        className={cn(
                          "flex-1 py-1.5 px-3 text-[10px] uppercase font-black tracking-wider rounded transition-all",
                          billingTab === 'paid' ? "bg-white text-black font-black font-mono" : "text-zinc-500 hover:text-white"
                        )}
                      >
                        Paid Settlements ({paidData.length})
                      </button>
                    </div>

                    {billingTab === 'unpaid' ? (
                      unpaidData.length === 0 ? (
                        <p className="text-zinc-500 text-center py-6 text-xs font-mono">No outstanding unpaid transactions listed.</p>
                      ) : (
                        unpaidData.map(p => {
                          const res = p.rentalId ? reservationsMap[p.rentalId] : null;
                          return (
                            <div key={p.id} className="bg-zinc-900 border border-[#27272a] p-4 rounded-xl flex justify-between items-center gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[9px] uppercase font-black tracking-wider text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-[#27272a]">
                                    {p.id.startsWith('cust_') ? 'Client Ref' : 'Res Invoice'}
                                  </span>
                                  <p className="text-[10px] font-mono text-zinc-400 select-all">{p.id.toUpperCase().slice(0, 14)}...</p>
                                </div>
                                <p className="text-sm font-black text-white">{p.customerName || `RES #${(p.rentalId || p.reservationId || '').slice(0, 8).toUpperCase()}`}</p>
                                <p className="text-xs text-zinc-400 font-medium">{p.description || 'Rental Agreement Settlement'}</p>
                                {res && (
                                  <p className="text-[10px] text-zinc-500 font-mono">Rented On: {res.startDate ? new Date(res.startDate?.toDate ? res.startDate.toDate() : res.startDate).toLocaleDateString() : 'N/A'}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-rose-500 font-mono font-black text-sm animate-pulse">${parseFloat(p.amount || 0).toFixed(2)}</p>
                                <button 
                                  onClick={() => markAsPaid(p.id, p.rentalId)}
                                  className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/20 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                                >
                                  Settle Paid
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      paidData.length === 0 ? (
                        <p className="text-zinc-500 text-center py-6 text-xs font-mono">No paid transactions logged yet.</p>
                      ) : (
                        paidData.map(p => {
                          const res = p.rentalId ? reservationsMap[p.rentalId] : null;
                          return (
                            <div key={p.id} className="bg-zinc-900 border border-white/5 p-4 rounded-xl flex justify-between items-center gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[9px] uppercase font-black tracking-wider text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                    Paid Receipts
                                  </span>
                                  <p className="text-[10px] font-mono text-zinc-500 select-all">{p.id.toUpperCase().slice(0, 14)}...</p>
                                </div>
                                <p className="text-sm font-black text-white">{p.customerName || `RES #${(p.rentalId || p.reservationId || '').slice(0, 8).toUpperCase()}`}</p>
                                <p className="text-xs text-zinc-400">{p.description || 'Rental Agreement Settlement'}</p>
                                <p className="text-[10px] text-zinc-600 font-mono">Settle Date: {p.date ? new Date(p.date?.toDate ? p.date.toDate() : p.date).toLocaleDateString() : 'N/A'}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-emerald-400 font-mono font-black text-sm">${parseFloat(p.amount || 0).toFixed(2)}</p>
                              </div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                )}

                {activeModal === 'active-rentals' && activeRentalsData.map(r => {
                  const cust = customerMap[r.customerId];
                  return (
                    <div key={r.id} className="bg-zinc-900 border border-[#27272a] p-4 rounded-lg space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-white uppercase tracking-tight">Reservation: {r.id.slice(0,8)}</p>
                          <p className="text-xs text-zinc-400 mt-1">Customer: <span className="font-mono text-zinc-300">{cust ? `${cust.firstName} ${cust.lastName}` : r.customerId}</span></p>
                          <p className="text-xs text-zinc-400">Date: <span className="text-zinc-300">{r.startDate ? new Date(r.startDate).toLocaleString() : 'N/A'}</span></p>
                        </div>
                      </div>
                      
                      {/* Advance Deposit Section */}
                      <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Advance Deposit</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Input amount if renter made an advance.</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="relative w-24">
                             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">$</span>
                             <input 
                               type="number"
                               defaultValue={r.depositAmount || 0}
                               onBlur={async (e) => {
                                 if (!db) return;
                                 const val = parseFloat(e.target.value) || 0;
                                 try {
                                   await updateDoc(doc(db, 'reservations', r.id), {
                                     depositAmount: val,
                                     depositStatus: val > 0 ? 'paid' : 'pending'
                                   });
                                   simulateNotification("Deposit Updated", "Successfully saved advance deposit.", NotificationType.SUCCESS, 'payment-deposits');
                                   await addDoc(collection(db, 'activity_logs'), {
                                      user: 'John (Staff)',
                                      details: `Updated advance deposit to $${val} for rental #${r.id.slice(0,8)}`,
                                      timestamp: new Date().toISOString()
                                   });
                                 } catch(e) {}
                               }}
                               className="w-full bg-[#09090b] border border-[#27272a] rounded-md pl-6 pr-2 py-1.5 text-xs font-mono text-white focus:border-blue-500/50 outline-none"
                             />
                           </div>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-[#27272a]">
                         <button 
                           onClick={async () => {
                             // find payment for this rental
                             if (!db) return;
                             try {
                               const qs = await getDocs(query(collection(db, 'rental_payments'), where('rentalId', '==', r.id)));
                               if (qs.empty) {
                                  // Auto-generate invoice if none exists to capture revenue
                                  await updateDoc(doc(db, 'reservations', r.id), { status: 'completed' });
                                  simulateNotification("Updated", "No invoice exists, but rental marked completed.", NotificationType.SUCCESS, 'ops-reservations');
                               } else {
                                 qs.forEach(doc => markAsPaid(doc.id));
                               }
                             } catch(e) {}
                           }}
                           className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded text-xs font-bold transition-colors uppercase gap-1 flex items-center"
                         >
                           Mark PAID
                         </button>
                         <button 
                           onClick={async () => {
                             if (!db) return;
                             try {
                               const qs = await getDocs(query(collection(db, 'rental_payments'), where('rentalId', '==', r.id)));
                               qs.forEach(doc => markAsUnpaid(doc.id));
                             } catch(e) {}
                           }}
                           className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded text-xs font-bold transition-colors uppercase gap-1 flex items-center"
                         >
                           Mark UNPAID
                         </button>
                      </div>
                    </div>
                  );
                })}
                {activeModal === 'active-rentals' && activeRentalsData.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-8">No active rentals at the moment.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
