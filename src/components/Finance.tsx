import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  CreditCard,
  BarChart3,
  Download,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { db } from '../firebase';
import { collection, onSnapshot, query, doc, addDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface CustomTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'revenue' | 'outstanding' | 'ops_cost';
  category: string;
  date: string;
  description?: string;
  createdAt: string;
}

interface LedgerBases {
  revenueBase: number;
  outstandingBase: number;
  opsCostBase: number;
}

export default function Finance() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'transactions'>('overview');
  const [downloading, setDownloading] = useState(false);

  // Raw fetched Firestore lists
  const [reservations, setReservations] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [customTransactions, setCustomTransactions] = useState<CustomTransaction[]>([]);
  const [ledgerBases, setLedgerBases] = useState<LedgerBases>({
    revenueBase: 0,
    outstandingBase: 0,
    opsCostBase: 0
  });

  const [loading, setLoading] = useState(true);

  // Overlay forms
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [isEditingBases, setIsEditingBases] = useState(false);

  // Adding Transaction form inputs
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState(500);
  const [txType, setTxType] = useState<'revenue' | 'outstanding' | 'ops_cost'>('revenue');
  const [txCategory, setTxCategory] = useState('Rental Addendum');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');

  // Editing base metrics inputs
  const [baseRevInput, setBaseRevInput] = useState(0);
  const [baseOutInput, setBaseOutInput] = useState(0);
  const [baseOpsInput, setBaseOpsInput] = useState(0);

  useEffect(() => {
    if (!db) return;

    // 1. Sync Base ledger configs
    const docRef = doc(db, 'finances', 'ledger');
    const unsubBases = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const val = docSnap.data() as LedgerBases;
        setLedgerBases({
          revenueBase: Number(val.revenueBase) ?? 0,
          outstandingBase: Number(val.outstandingBase) ?? 0,
          opsCostBase: Number(val.opsCostBase) ?? 0
        });
        setBaseRevInput(Number(val.revenueBase) ?? 0);
        setBaseOutInput(Number(val.outstandingBase) ?? 0);
        setBaseOpsInput(Number(val.opsCostBase) ?? 0);
      }
    });

    // 2. Sync Reservations for automatic revenue sums
    const qReservations = query(collection(db, 'reservations'));
    const unsubReservations = onSnapshot(qReservations, (snap) => {
      setReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Sync Maintenance costs
    const qLogs = query(collection(db, 'maintenance_logs'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setMaintenanceLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Sync custom manual transactions log
    const qTransactions = query(collection(db, 'transactions'));
    const unsubTransactions = onSnapshot(qTransactions, (snap) => {
      setCustomTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomTransaction)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => {
      unsubBases();
      unsubReservations();
      unsubLogs();
      unsubTransactions();
    };
  }, []);

  // Helpers to parse timestamps or string dates to dynamic Month indexes
  const parseDateToMonthStr = (dateVal: any): string | null => {
    if (!dateVal) return null;
    let d: Date;
    if (dateVal.toDate) {
      d = dateVal.toDate();
    } else {
      d = new Date(dateVal);
    }
    if (isNaN(d.getTime())) return null;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()];
  };

  // FINANCIAL AGGREGATIONS -- ALL ADDING UP LIVE
  // 1. Net Revenue: baseRevenue + Active Contracts amount + Ledger transactions of 'revenue'
  const activeContractsRevenue = reservations
    .filter(res => res.status === 'confirmed' || res.status === 'active' || res.status === 'completed')
    .reduce((sum, res) => sum + (Number(res.totalAmount) || 0), 0);

  const customRevenueSum = customTransactions
    .filter(tx => tx.type === 'revenue')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const finalRevenue = ledgerBases.revenueBase + activeContractsRevenue + customRevenueSum;

  // 2. Outstanding Balance: baseOutstanding + Pending/held-deposit amounts + Ledger transactions of 'outstanding'
  const activeOutstandingRentals = reservations
    .filter(res => res.status === 'quote' || res.depositStatus === 'held')
    .reduce((sum, res) => sum + (Number(res.totalAmount) || 0), 0);

  const customOutstandingSum = customTransactions
    .filter(tx => tx.type === 'outstanding')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const finalOutstanding = ledgerBases.outstandingBase + activeOutstandingRentals + customOutstandingSum;

  // 3. Operating Costs: baseOpsCost + Maintenance cost sums + Ledger transactions of 'ops_cost'
  const activeMaintenanceCost = maintenanceLogs
    .reduce((sum, log) => sum + (Number(log.cost) || 0), 0);

  const customOpsCostSum = customTransactions
    .filter(tx => tx.type === 'ops_cost')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const finalOpsCosts = ledgerBases.opsCostBase + activeMaintenanceCost + customOpsCostSum;

  // 4. EBITDA = revenue - costs
  const finalEBITDA = finalRevenue - finalOpsCosts;

  // Monthly breakdown for Reports Chart
  const getDynamicMonthlyData = () => {
    const historicalBase = [
      { month: 'Jan', maintenance: 0, revenue: 0 },
      { month: 'Feb', maintenance: 0, revenue: 0 },
      { month: 'Mar', maintenance: 0, revenue: 0 },
      { month: 'Apr', maintenance: 0, revenue: 0 },
      { month: 'May', maintenance: 0, revenue: 0 },
      { month: 'Jun', maintenance: 0, revenue: 0 },
      { month: 'Jul', maintenance: 0, revenue: 0 },
      { month: 'Aug', maintenance: 0, revenue: 0 },
      { month: 'Sep', maintenance: 0, revenue: 0 },
      { month: 'Oct', maintenance: 0, revenue: 0 },
      { month: 'Nov', maintenance: 0, revenue: 0 },
      { month: 'Dec', maintenance: 0, revenue: 0 },
    ];

    // Overlay database records on baseline
    reservations.forEach(res => {
      const mLabel = parseDateToMonthStr(res.startDate);
      if (mLabel) {
        const index = historicalBase.findIndex(item => item.month === mLabel);
        if (index !== -1 && (res.status === 'confirmed' || res.status === 'active' || res.status === 'completed')) {
          historicalBase[index].revenue += (Number(res.totalAmount) || 0);
        }
      }
    });

    maintenanceLogs.forEach(log => {
      const mLabel = parseDateToMonthStr(log.scheduledDate || log.createdAt);
      if (mLabel) {
        const index = historicalBase.findIndex(item => item.month === mLabel);
        if (index !== -1) {
          historicalBase[index].maintenance += (Number(log.cost) || 0);
        }
      }
    });

    customTransactions.forEach(tx => {
      const mLabel = parseDateToMonthStr(tx.date);
      if (mLabel) {
        const index = historicalBase.findIndex(item => item.month === mLabel);
        if (index !== -1) {
          if (tx.type === 'revenue') {
            historicalBase[index].revenue += tx.amount;
          } else if (tx.type === 'ops_cost') {
            historicalBase[index].maintenance += tx.amount;
          }
        }
      }
    });

    return historicalBase;
  };

  const currentChartData = getDynamicMonthlyData();

  // Handle Updates
  const handleSaveBases = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    try {
      await setDoc(doc(db, 'finances', 'ledger'), {
        revenueBase: Number(baseRevInput),
        outstandingBase: Number(baseOutInput),
        opsCostBase: Number(baseOpsInput)
      });
      setIsEditingBases(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update baseline stats.');
    }
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        title: txTitle,
        amount: Number(txAmount),
        type: txType,
        category: txCategory,
        date: txDate,
        description: txDesc,
        createdAt: new Date().toISOString()
      });
      setIsAddingTx(false);
      setTxTitle('');
      setTxAmount(500);
      setTxDesc('');
    } catch (err) {
      console.error(err);
      alert('Failed to append custom transaction.');
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!db) return;
    if (!confirm('Permanently purge this custom transaction ledger entry?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      console.error(err);
      alert('Failed to erase entry.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const handleDownloadReport = async () => {
    const input = document.getElementById('finance-report-container');
    if (!input) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#09090b', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('fleet-finance-report.pdf');
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Financial Ledger</h1>
          <p className="text-zinc-500 text-sm mt-1">Cashflow, baseline targets, and real-time transaction auditing.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-[#111113] border border-[#27272a] rounded-xl p-1 self-start sm:self-auto shrink-0">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
              activeTab === 'overview' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
              activeTab === 'reports' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Performance Chart
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
              activeTab === 'transactions' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            Custom Listings ({customTransactions.length})
          </button>
        </div>
      </div>

      {/* Main Tabs Conditionals */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in">
          
          {/* Main Key Figures Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* NET REVENUE CARD */}
            <div 
              onClick={() => {
                setBaseRevInput(ledgerBases.revenueBase);
                setIsEditingBases(true);
              }}
              className="p-6 bg-[#09090b] border border-[#27272a] hover:border-blue-500/40 rounded-2xl space-y-2 cursor-pointer transition-all hover:scale-[1.02] relative group"
              title="Click to Edit Base Override Settings"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Aggregate Net Revenue</p>
                <Settings size={12} className="text-zinc-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <p className="text-2xl font-black text-white">{formatCurrency(finalRevenue)}</p>
                <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                  <ArrowUpRight size={10} />
                  +12.5%
                </div>
              </div>
              <p className="text-[8px] text-zinc-600 font-mono pt-1">
                Base Override: {formatCurrency(ledgerBases.revenueBase)} (Live Jobs +{formatCurrency(activeContractsRevenue)})
              </p>
            </div>

            {/* OUTSTANDING CARD */}
            <div 
              onClick={() => {
                setBaseOutInput(ledgerBases.outstandingBase);
                setIsEditingBases(true);
              }}
              className="p-6 bg-[#09090b] border border-[#27272a] hover:border-amber-500/40 rounded-2xl space-y-2 cursor-pointer transition-all hover:scale-[1.02] relative group"
              title="Click to Edit Base Override Settings"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Unreleased Outstanding</p>
                <Settings size={12} className="text-zinc-600 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <p className="text-2xl font-black text-white">{formatCurrency(finalOutstanding)}</p>
                <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/15">
                  <ArrowDownRight size={10} />
                  -2.4%
                </div>
              </div>
              <p className="text-[8px] text-zinc-600 font-mono pt-1">
                Base Override: {formatCurrency(ledgerBases.outstandingBase)} (Held Deposits +{formatCurrency(activeOutstandingRentals)})
              </p>
            </div>

            {/* OPS COSTS CARD */}
            <div 
              onClick={() => {
                setBaseOpsInput(ledgerBases.opsCostBase);
                setIsEditingBases(true);
              }}
              className="p-6 bg-[#09090b] border border-[#27272a] hover:border-orange-500/40 rounded-2xl space-y-2 cursor-pointer transition-all hover:scale-[1.02] relative group"
              title="Click to Edit Base Override Settings"
            >
               <div className="flex justify-between items-start">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Operating Costs</p>
                <Settings size={12} className="text-zinc-600 group-hover:text-orange-400 transition-colors" />
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <p className="text-2xl font-black text-white">{formatCurrency(finalOpsCosts)}</p>
                <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15">
                  <ArrowUpRight size={10} />
                  +0.8%
                </div>
              </div>
              <p className="text-[8px] text-zinc-600 font-mono pt-1">
                Base Override: {formatCurrency(ledgerBases.opsCostBase)} (Maint. Logs +{formatCurrency(activeMaintenanceCost)})
              </p>
            </div>

            {/* EBITDA NET PROFIT CARD */}
            <div className="p-6 bg-[#09090b] border border-[#1d281d] bg-gradient-to-br from-[#0c0d10] to-[#040d04]/20 rounded-2xl space-y-2">
              <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Calculated EBITDA Margin</p>
              <div className="flex items-baseline justify-between pt-2">
                <p className="text-2xl font-black text-emerald-400">{formatCurrency(finalEBITDA)}</p>
                <div className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">
                  HEALTHY
                </div>
              </div>
              <p className="text-[8px] text-zinc-500 font-mono pt-1">
                Net operational profit after subtracting all logistics & overheads
              </p>
            </div>
          </div>

          {/* Quick Actions & Static Highlight Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Record custom transactions */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-white uppercase tracking-widest text-xs">Ledger Entry Generator</h3>
                <p className="text-zinc-500 text-xs mt-2 italic leading-relaxed">
                  Inject precise financial modifications directly into live calculations. Add new revenues, write off logs, or add custom operating overheads.
                </p>
              </div>
              <button 
                onClick={() => setIsAddingTx(true)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                <Plus size={14} /> Post Account Adjustment
              </button>
            </div>

            {/* Live Synchronizations display */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-2xl p-6 space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f22]">
                <h3 className="font-bold text-white uppercase tracking-widest text-xs">Live Database Integration Status</h3>
                <span className="text-[8px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded font-black tracking-widest uppercase border border-blue-500/15">Active Sync</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-zinc-900/40 border border-[#1f1f22] rounded-xl">
                  <p className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Active Rentals Subtotal</p>
                  <p className="text-sm font-bold text-white mt-1">{formatCurrency(activeContractsRevenue)}</p>
                  <p className="text-[9px] text-zinc-600 mt-1">From db/reservations</p>
                </div>
                <div className="p-3 bg-zinc-900/40 border border-[#1f1f22] rounded-xl">
                  <p className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Active Maintenance</p>
                  <p className="text-sm font-bold text-zinc-300 mt-1">{formatCurrency(activeMaintenanceCost)}</p>
                  <p className="text-[9px] text-zinc-600 mt-1">From db/maintenance_logs</p>
                </div>
                <div className="p-3 bg-zinc-900/40 border border-[#1f1f22] rounded-xl">
                  <p className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">Manual Adjustments</p>
                  <p className="text-sm font-bold text-amber-500 mt-1">
                    {formatCurrency(customRevenueSum - customOpsCostSum)}
                  </p>
                  <p className="text-[9px] text-zinc-600 mt-1">From db/transactions</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans italic text-center pt-2">
                All metrics are mathematically locked. Deleting reservations, changing statuses, or completing maintenance tasks will cascade instantly to this financial panel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reports Chart Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Fleet Efficiency Visualization</h2>
              <p className="text-zinc-600 text-xs mt-1">Aggregated historical base values + dynamic live updates.</p>
            </div>
            
            <button 
              onClick={handleDownloadReport}
              disabled={downloading}
              className="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 self-start"
            >
              {downloading ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-black rounded-full animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Export Financial PDF
            </button>
          </div>

          <div id="finance-report-container" className="bg-[#09090b] border border-[#27272a] p-6 sm:p-8 rounded-2xl space-y-8">
            <div className="flex justify-between items-end border-b border-[#27272a] pb-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">YTD Financial Efficiency</h2>
                  <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-black">Maintenance Cost vs Rental Revenue</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Aggregate EBITDA Profit</p>
                  <p className="text-emerald-400 font-bold text-lg">{formatCurrency(finalEBITDA)}</p>
                </div>
            </div>

            <div className="h-[380px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentChartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    cursor={{ fill: '#ffffff/[0.03]', opacity: 0.1 }}
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    itemStyle={{ fontSize: '10px', textTransform: 'uppercase' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} 
                    iconType="circle"
                  />
                  <Bar dataKey="revenue" name="Full Rental Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="maintenance" name="Operations Costs" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-[#27272a]">
               <div className="p-4 bg-zinc-900/30 rounded-xl">
                 <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Base Revenues Applied</p>
                 <p className="text-lg font-black text-white mt-1">{formatCurrency(ledgerBases.revenueBase)}</p>
               </div>
               <div className="p-4 bg-zinc-900/30 rounded-xl">
                 <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Cumulative Dynamic Jobs</p>
                 <p className="text-lg font-black text-blue-400 mt-1">+{formatCurrency(activeContractsRevenue)}</p>
               </div>
               <div className="p-4 bg-zinc-900/30 rounded-xl">
                 <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Operations Expenditures</p>
                 <p className="text-lg font-black text-amber-500 mt-1">{formatCurrency(finalOpsCosts)}</p>
               </div>
               <div className="p-4 bg-zinc-900/30 rounded-xl">
                 <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total Monthly Points</p>
                 <p className="text-lg font-black text-emerald-400 mt-1">6 Active Bins</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Transactions Listings */}
      {activeTab === 'transactions' && (
        <div className="space-y-6 animate-in fade-in">
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest">Custom Modifications Logs</h2>
              <p className="text-zinc-600 text-xs mt-1">List of all manually injected ledger adjustments.</p>
            </div>
            <button 
              onClick={() => setIsAddingTx(true)}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Transaction
            </button>
          </div>

          <div className="bg-[#09090b] border border-[#27272a] rounded-2xl overflow-hidden text-xs">
            {customTransactions.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center space-y-2">
                <CreditCard className="w-8 h-8 text-zinc-700" />
                <p className="font-bold text-white uppercase tracking-tight">No Custom Adjustments Ledger Files</p>
                <p className="max-w-xs text-zinc-600 text-[11px] leading-relaxed">
                  Post adjustments to fine-tune operations cost lines or rental cash flows.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#27272a]">
                {customTransactions.map(tx => {
                  const isRevenue = tx.type === 'revenue';
                  const isOps = tx.type === 'ops_cost';
                  const isOut = tx.type === 'outstanding';

                  let badgeStyle = '';
                  let prefix = '';
                  if (isRevenue) {
                    badgeStyle = 'bg-blue-500/10 text-blue-400 border border-blue-500/15';
                    prefix = '+';
                  } else if (isOps) {
                    badgeStyle = 'bg-amber-500/10 text-amber-500 border border-amber-500/15';
                    prefix = '-';
                  } else {
                    badgeStyle = 'bg-purple-500/10 text-purple-400 border border-purple-500/15';
                    prefix = '•';
                  }

                  return (
                    <div key={tx.id} className="p-4 hover:bg-zinc-900/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 bg-zinc-900 border border-[#27272a] text-zinc-500 rounded-lg flex items-center justify-center shrink-0">
                          <CreditCard size={16} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-white uppercase tracking-tight text-sm">{tx.title}</span>
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest", badgeStyle)}>
                              {tx.type === 'revenue' ? 'Revenue' : tx.type === 'ops_cost' ? 'Operating cost' : 'Outstanding'}
                            </span>
                          </div>
                          <p className="text-zinc-500 pt-1 font-mono text-[10px]">{tx.category} • Posted: {tx.date}</p>
                          {tx.description && <p className="text-zinc-600 mt-1 italic font-sans text-[11px] max-w-lg">{tx.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-[#111113] sm:border-0">
                        <div className="text-right">
                          <p className={cn("text-base font-black font-mono", isRevenue ? "text-blue-400" : isOps ? "text-amber-500" : "text-purple-400")}>
                            {prefix}{formatCurrency(tx.amount)}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteTx(tx.id)}
                          className="p-1.5 hover:bg-rose-500/10 rounded-lg text-zinc-500 hover:text-rose-500 transition-colors"
                          title="Purge Entry"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal - Configure baseline offsets */}
      <AnimatePresence>
        {isEditingBases && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#09090b] border border-[#27272a] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-[#27272a] flex justify-between items-center bg-[#0d0d0f]">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Adjust Baseline Metrics</h3>
                  <p className="text-xs text-zinc-500 mt-1">Inject starting assets/liabilities offset targets.</p>
                </div>
                <button 
                  onClick={() => setIsEditingBases(false)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveBases} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Baseline Net Revenue ($)</label>
                  <input 
                    type="number" 
                    value={baseRevInput} 
                    onChange={e => setBaseRevInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                    min="0"
                    required 
                  />
                  <span className="text-[9px] text-zinc-600 font-mono italic block">Starting point for cumulative income calculations.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Baseline Outstanding Receivables ($)</label>
                  <input 
                    type="number" 
                    value={baseOutInput} 
                    onChange={e => setBaseOutInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                    min="0"
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Baseline Operating Costs ($)</label>
                  <input 
                    type="number" 
                    value={baseOpsInput} 
                    onChange={e => setBaseOpsInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                    min="0"
                    required 
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-[#27272a]">
                  <button 
                    type="button" 
                    onClick={() => setIsEditingBases(false)}
                    className="px-4 py-2 border border-[#27272a] hover:bg-white/5 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-black uppercase tracking-widest text-white transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Post Account Adjustment */}
      <AnimatePresence>
        {isAddingTx && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#09090b] border border-[#27272a] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-[#27272a] flex justify-between items-center bg-[#0d0d0f]">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Post Adjusting Ledger Entry</h3>
                  <p className="text-xs text-zinc-500 mt-1">Commit custom additions or expenses directly to accounts.</p>
                </div>
                <button 
                  onClick={() => setIsAddingTx(false)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateTx} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Entry Header / Title</label>
                  <input 
                    type="text" 
                    value={txTitle} 
                    onChange={e => setTxTitle(e.target.value)}
                    placeholder="e.g. Garage Monthly Rental, Additional Premium Inflow"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Transaction Value ($)</label>
                    <input 
                      type="number" 
                      value={txAmount} 
                      onChange={e => setTxAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                      min="0.01"
                      step="any"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Log Date</label>
                    <input 
                      type="date" 
                      value={txDate} 
                      onChange={e => setTxDate(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Account Classification</label>
                    <select 
                      value={txType} 
                      onChange={e => setTxType(e.target.value as any)} 
                      className="w-[#100%] bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    >
                      <option value="revenue">Inflow (Net Revenue)</option>
                      <option value="outstanding">Outstanding / Receivables</option>
                      <option value="ops_cost">Outflow (Ops Cost)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Category Label</label>
                    <select 
                      value={txCategory} 
                      onChange={e => setTxCategory(e.target.value)} 
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    >
                      <option value="Rental Addendum">Rental Addendum</option>
                      <option value="Office Lease / Utility">Office Lease / Utility</option>
                      <option value="Dynamic Inflows">Dynamic Inflow</option>
                      <option value="Parts & Fleet Sourcing">Parts & Fleet Sourcing</option>
                      <option value="Licensing & Insurance">Licensing & Insurance</option>
                      <option value="Staff Payroll / Commission">Staff Payroll / Commission</option>
                      <option value="Custom Expense Lines">Custom Expense</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Description Details</label>
                  <textarea 
                    value={txDesc} 
                    onChange={e => setTxDesc(e.target.value)}
                    placeholder="Enter technical details, invoice IDs, reference garage details..."
                    rows={3}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-[#27272a]">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingTx(false)}
                    className="px-4 py-2 border border-[#27272a] hover:bg-white/5 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-black uppercase tracking-widest text-white transition-colors"
                  >
                    Post Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
