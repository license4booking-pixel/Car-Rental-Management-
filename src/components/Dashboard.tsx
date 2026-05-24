import React from 'react';
import { 
  BarChart3, 
  Car, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  MoreVertical,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';
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

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#09090b] border border-[#27272a] p-6 rounded-xl relative overflow-hidden group hover:border-zinc-700 transition-colors"
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
        <h3 className="text-2xl font-bold text-[#fafafa] tracking-tight tabular-nums">{value}</h3>
        <span className={cn("text-[10px] font-bold mb-1 px-1.5 py-0.5 rounded-md", trend > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10")}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      </div>
    </div>
  </motion.div>
);

import { db } from '../firebase';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { seedData } from '../seed';

export default function Dashboard() {
  const { simulateNotification } = useNotifications();
  const [isEmpty, setIsEmpty] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);

  React.useEffect(() => {
    const checkEmpty = async () => {
      const q = query(collection(db, 'vehicles'), limit(1));
      const snap = await getDocs(q);
      setIsEmpty(snap.empty);
    };
    checkEmpty();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    await seedData();
    setIsEmpty(false);
    setSeeding(false);
    simulateNotification("Database Seeded", "Fleet inventory has been populated with initial assets.", NotificationType.SUCCESS);
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
          {isEmpty && (
            <button 
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-500 transition-colors uppercase tracking-tight disabled:opacity-50"
            >
              {seeding ? 'Processing...' : 'Seed Database'}
            </button>
          )}
          <button className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:text-white transition-colors">
            Analytics
          </button>
          <button className="px-4 py-2 bg-white text-black rounded-lg text-xs font-black hover:bg-zinc-200 transition-colors uppercase tracking-tight shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            New Directive
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Revenue" value="$0" trend={0} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard label="Active Rentals" value="0" trend={0} icon={Car} color="bg-emerald-500" />
        <StatCard label="Total Customers" value="0" trend={0} icon={Users} color="bg-blue-500" />
        <StatCard label="Pending Tasks" value="0" trend={0} icon={Clock} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[#09090b] border border-[#27272a] p-6 rounded-xl">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <h3 className="text-sm font-bold text-white uppercase tracking-wider">Revenue Stream</h3>
            </div>
            <select className="bg-zinc-900 border border-[#27272a] text-zinc-500 text-[10px] font-bold uppercase rounded px-2 py-1 outline-none hover:text-white transition-colors cursor-pointer">
              <option>WEEkLY_SNAPSHOT</option>
              <option>MONTHLY_DATA</option>
            </select>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 10, fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-[#09090b] border border-[#27272a] p-6 rounded-xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Notification Simulator</h3>
              <Zap size={14} className="text-blue-500" />
            </div>
            <div className="flex-1 space-y-4">
              {triggers.map((t, i) => (
                <button 
                  key={i} 
                  onClick={() => simulateNotification(t.title, t.msg, t.type)}
                  className="w-full text-left p-4 rounded-xl bg-[#111113] border border-[#27272a] hover:border-zinc-700 transition-all group"
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
            <div className="mt-8 p-4 bg-blue-600/5 rounded-xl border border-blue-500/20">
               <p className="text-[9px] font-bold text-blue-400 uppercase leading-relaxed">
                 Real-time events sync via Firebase Cloud Messaging & Firestore.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
