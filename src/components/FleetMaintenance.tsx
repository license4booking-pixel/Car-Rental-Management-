import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, onSnapshot, query, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Vehicle } from '../types';

interface MaintenanceLog {
  id: string;
  vehicleId: string;
  serviceType: string;
  cost: number;
  scheduledDate: string;
  completedDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  details?: string;
  createdAt: string;
}

export default function FleetMaintenance() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Modals / Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);

  // New Log inputs
  const [formVehicle, setFormVehicle] = useState('');
  const [formType, setFormType] = useState('');
  const [formCost, setFormCost] = useState(150);
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formStatus, setFormStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [formDetails, setFormDetails] = useState('');

  // Editing Log inputs
  const [editCost, setEditCost] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editCompletedDate, setEditCompletedDate] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editType, setEditType] = useState('');

  // Load vehicles & logs
  useEffect(() => {
    if (!db) return;

    // Load logs
    const qLogs = query(collection(db, 'maintenance_logs'));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceLog)));
      setLoading(false);
    }, (err) => {
      console.error("Firestore loading error:", err);
      setLoading(false);
    });

    // Load available vehicles
    const qVehicles = query(collection(db, 'vehicles'));
    const unsubVehicles = onSnapshot(qVehicles, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    });

    return () => {
      unsubLogs();
      unsubVehicles();
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (!formVehicle) {
      alert("Please select a target fleet asset!");
      return;
    }

    try {
      const data: Omit<MaintenanceLog, 'id'> = {
        vehicleId: formVehicle,
        serviceType: formType,
        cost: Number(formCost),
        scheduledDate: formScheduledDate || new Date().toISOString().split('T')[0],
        status: formStatus,
        details: formDetails,
        createdAt: new Date().toISOString().split('T')[0]
      };

      if (formStatus === 'completed') {
        data.completedDate = new Date().toISOString().split('T')[0];
      }

      await addDoc(collection(db, 'maintenance_logs'), data);

      // Reset form
      setIsAdding(false);
      setFormVehicle('');
      setFormType('');
      setFormCost(150);
      setFormScheduledDate('');
      setFormStatus('pending');
      setFormDetails('');
    } catch (err) {
      console.error(err);
      alert("Failed to draft maintenance log.");
    }
  };

  const handleStartEdit = (log: MaintenanceLog) => {
    setEditingLog(log);
    setEditCost(log.cost);
    setEditStatus(log.status);
    setEditScheduledDate(log.scheduledDate);
    setEditCompletedDate(log.completedDate || '');
    setEditDetails(log.details || '');
    setEditType(log.serviceType);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !editingLog) return;

    try {
      const updateData: Partial<MaintenanceLog> = {
        serviceType: editType,
        cost: Number(editCost),
        status: editStatus,
        scheduledDate: editScheduledDate,
        details: editDetails
      };

      if (editStatus === 'completed') {
        updateData.completedDate = editCompletedDate || new Date().toISOString().split('T')[0];
      } else {
        // If status shifted back, remove completed date
        updateData.completedDate = '';
      }

      await updateDoc(doc(db, 'maintenance_logs', editingLog.id), updateData);
      setEditingLog(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update maintenance records.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (!confirm("Are you sure you want to permanently delete this maintenance report? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, 'maintenance_logs', id));
      if (editingLog?.id === id) {
        setEditingLog(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete record.");
    }
  };

  const handleQuickStatus = async (log: MaintenanceLog, newStatus: 'pending' | 'in_progress' | 'completed') => {
    if (!db) return;
    try {
      const updateData: Partial<MaintenanceLog> = {
        status: newStatus
      };
      if (newStatus === 'completed') {
        updateData.completedDate = new Date().toISOString().split('T')[0];
      } else {
        updateData.completedDate = '';
      }
      await updateDoc(doc(db, 'maintenance_logs', log.id), updateData);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper matching vehicle details
  const getVehicleString = (id: string) => {
    const v = vehicles.find(item => item.id === id);
    if (!v) return "Unknown Fleet Asset";
    return `${v.year} ${v.make} ${v.model} (${v.plateNumber})`;
  };

  // Format helper for currency
  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Statistics calculation
  const stats = {
    totalCost: logs.reduce((acc, log) => acc + (log.cost || 0), 0),
    pendingCount: logs.filter(l => l.status === 'pending').length,
    inProgressCount: logs.filter(l => l.status === 'in_progress').length,
    completedCount: logs.filter(l => l.status === 'completed').length
  };

  // Filter and search computation
  const filteredLogs = logs.filter(log => {
    const vStr = getVehicleString(log.vehicleId).toLowerCase();
    const typeStr = log.serviceType.toLowerCase();
    const matchesSearch = vStr.includes(search.toLowerCase()) || typeStr.includes(search.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return log.status === filter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Fleet Maintenance</h1>
          <p className="text-zinc-500 text-sm mt-1">Track servicing logs, dispatch, costs, and scheduled inspections.</p>
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            // Default first vehicle in selection list if available
            if (vehicles.length > 0) {
              setFormVehicle(vehicles[0].id);
            }
          }} 
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)] self-start"
        >
          <Plus size={16} /> Schedule Maintenance
        </button>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#09090b] border border-[#27272a] p-5 rounded-2xl">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Cumulative Expenses</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-black text-white">{formatCost(stats.totalCost)}</h3>
            <span className="text-[10px] text-zinc-400 font-mono">USD</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
            <DollarSign size={12} className="text-blue-500" />
            <span>Across {logs.length} logged files</span>
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-5 rounded-2xl">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Scheduled (Pending)</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-black text-amber-500">{stats.pendingCount}</h3>
            <span className="text-[10px] text-zinc-400">queues</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
            <Clock size={12} className="text-amber-500 animate-pulse" />
            <span>Awaiting active service launch</span>
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-5 rounded-2xl">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">In Progress</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-black text-blue-500">{stats.inProgressCount}</h3>
            <span className="text-[10px] text-zinc-400">active</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
            <Wrench size={12} className="text-blue-500 animate-spin duration-3000" />
            <span>Currently under repair work</span>
          </div>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-5 rounded-2xl">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Completed Logs</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-black text-emerald-500">{stats.completedCount}</h3>
            <span className="text-[10px] text-zinc-400">fixed</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>Certified fit for immediate rental</span>
          </div>
        </div>
      </div>

      {/* Control Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#09090b] border border-[#27272a] p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'pending', 'in_progress', 'completed'].map((statusOption) => (
            <button
              key={statusOption}
              onClick={() => setFilter(statusOption)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors",
                filter === statusOption 
                  ? "bg-white text-black" 
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              )}
            >
              {statusOption === 'in_progress' ? 'In Progress' : statusOption}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by Vehicle model, Plate, or Issue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-500 transition-colors"
          />
        </div>
      </div>

      {/* Adding Log Modal Overlay */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#09090b] border border-[#27272a] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-[#27272a] flex justify-between items-center bg-[#0d0d0f]">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">Create Maintenance Request</h3>
                  <p className="text-xs text-zinc-500 mt-1">Configure diagnostics & cost limits for ofline services.</p>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Target Fleet Asset</label>
                  <select 
                    value={formVehicle} 
                    onChange={e => setFormVehicle(e.target.value)} 
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    required
                  >
                    <option value="" disabled>-- Select Active Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} [{v.plateNumber}] - {v.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Service Issue / Category</label>
                  <input 
                    type="text" 
                    value={formType} 
                    onChange={e => setFormType(e.target.value)}
                    placeholder="e.g. Tire Balancing, Brake Refurbish, Annual Inspection"
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Projected Cost ($)</label>
                    <input 
                      type="number" 
                      value={formCost} 
                      onChange={e => setFormCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                      min="0"
                      step="any"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Scheduled Date</label>
                    <input 
                      type="date" 
                      value={formScheduledDate} 
                      onChange={e => setFormScheduledDate(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Current Status</label>
                  <select 
                    value={formStatus} 
                    onChange={e => setFormStatus(e.target.value as any)} 
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Details & Repairs Specification</label>
                  <textarea 
                    value={formDetails} 
                    onChange={e => setFormDetails(e.target.value)}
                    placeholder="Enter details about repair orders, parts needed, garage reference..."
                    rows={3}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-[#27272a]">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 border border-[#27272a] hover:bg-white/5 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-black uppercase tracking-widest text-white transition-colors"
                  >
                    Deploy Order
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed Editing Modal */}
      <AnimatePresence>
        {editingLog && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#09090b] border border-[#27272a] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-6 border-b border-[#27272a] flex justify-between items-center bg-[#0d0d0f]">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-amber-500">Configure Service Report</h3>
                  <p className="text-xs text-zinc-500 mt-1">Reviewing maintenance ID: {editingLog.id.slice(0, 10)}</p>
                </div>
                <button 
                  onClick={() => setEditingLog(null)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Fleet Asset</span>
                  <div className="bg-[#18181b] border border-[#27272a] px-3 py-2 rounded-lg text-zinc-400 font-medium">
                    {getVehicleString(editingLog.vehicleId)}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Service / Repair Issue Type</label>
                  <input 
                    type="text" 
                    value={editType} 
                    onChange={e => setEditType(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Final Logged Cost ($)</label>
                    <input 
                      type="number" 
                      value={editCost} 
                      onChange={e => setEditCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                      min="0"
                      step="any"
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Scheduled Date</label>
                    <input 
                      type="date" 
                      value={editScheduledDate} 
                      onChange={e => setEditScheduledDate(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Repair Status</label>
                    <select 
                      value={editStatus} 
                      onChange={e => setEditStatus(e.target.value as any)} 
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Completion Date</label>
                    <input 
                      type="date" 
                      value={editCompletedDate} 
                      onChange={e => setEditCompletedDate(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 disabled:opacity-40" 
                      disabled={editStatus !== 'completed'}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Technical Details / Findings</label>
                  <textarea 
                    value={editDetails} 
                    onChange={e => setEditDetails(e.target.value)}
                    rows={3}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 resize-none font-sans"
                  />
                </div>

                <div className="pt-4 flex justify-between gap-3 border-t border-[#27272a]">
                  <button 
                    type="button" 
                    onClick={() => handleDelete(editingLog.id)}
                    className="flex items-center gap-1 px-3 py-2 border border-rose-900 bg-rose-950/20 text-rose-400 hover:text-white hover:bg-rose-900 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <Trash2 size={14} /> Erase Record
                  </button>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => setEditingLog(null)}
                      className="px-4 py-2 border border-[#27272a] hover:bg-white/5 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg text-xs font-black uppercase tracking-widest text-black transition-colors"
                    >
                      Update Log
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logs Table / List Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-zinc-500 text-sm animate-pulse flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Scanning maintenance archives...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 bg-[#09090b] border border-[#27272a] rounded-2xl text-zinc-500 text-sm flex flex-col items-center justify-center p-6 space-y-3">
            <Wrench className="w-8 h-8 text-zinc-600" />
            <p className="font-bold text-white tracking-tight uppercase">No Maintenance Records Found</p>
            <p className="text-zinc-500 text-xs max-w-sm">No maintenance incidents match your search or filter requirements. Click "Schedule Maintenance" to initiate a log file.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredLogs.map((log) => {
              // Status Styling
              const isComp = log.status === 'completed';
              const isInProg = log.status === 'in_progress';
              const statusLabel = isComp ? 'Completed' : isInProg ? 'In Progress' : 'Pending';
              
              const statusBadgeStyle = isComp 
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                : isInProg 
                  ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' 
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/20';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="group bg-[#09090b] border border-[#27272a] rounded-2xl p-6 hover:border-zinc-700 transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5"
                >
                  {/* Left Column: Icon & Vehicle/Issue Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-zinc-900 border border-[#27272a] rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-white shrink-0 transition-all">
                      <Wrench className={cn("w-5 h-5", isInProg && "animate-spin duration-3000")} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-white uppercase tracking-tight text-sm hover:text-zinc-300">{log.serviceType}</h4>
                        <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest", statusBadgeStyle)}>
                          {statusLabel}
                        </span>
                      </div>
                      
                      <p className="text-xs text-blue-400 font-bold">{getVehicleString(log.vehicleId)}</p>

                      {log.details && (
                        <p className="text-xs text-zinc-500 max-w-xl mt-1.5 leading-relaxed font-sans">{log.details}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[10px] text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>Logged: {log.createdAt}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span>Scheduled: {log.scheduledDate}</span>
                        </div>
                        {isComp && log.completedDate && (
                          <div className="flex items-center gap-1 text-emerald-500 font-bold">
                            <Check size={12} />
                            <span>Finished: {log.completedDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Cost and Administrative Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto mt-4 lg:mt-0 pt-4 lg:pt-0 border-t border-[#27272a] lg:border-0">
                    <div className="text-right">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Logged expense</span>
                      <span className="text-lg font-black text-white">{formatCost(log.cost)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick progress triggers */}
                      {log.status === 'pending' && (
                        <button 
                          onClick={() => handleQuickStatus(log, 'in_progress')}
                          className="p-2 hover:bg-blue-500/10 rounded-lg text-zinc-500 hover:text-blue-400 transition-colors"
                          title="Start Service Work"
                        >
                          <Play size={15} />
                        </button>
                      )}
                      
                      {log.status === 'in_progress' && (
                        <button 
                          onClick={() => handleQuickStatus(log, 'completed')}
                          className="p-2 hover:bg-emerald-500/10 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors animate-pulse"
                          title="Certify Repairs Finished"
                        >
                          <Check size={15} />
                        </button>
                      )}

                      {log.status === 'completed' && (
                        <button 
                          onClick={() => handleQuickStatus(log, 'pending')}
                          className="p-2 hover:bg-amber-500/10 rounded-lg text-zinc-500 hover:text-amber-400 transition-colors"
                          title="Restore back to Pending"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}

                      {/* Explicit Configuration Trigger */}
                      <button 
                        onClick={() => handleStartEdit(log)}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                        title="Configure Details"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete service file action */}
                      <button 
                        onClick={() => handleDelete(log.id)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-zinc-500 hover:text-rose-500 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
