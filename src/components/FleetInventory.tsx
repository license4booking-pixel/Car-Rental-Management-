import React from 'react';
import { 
  X,
  Car as CarIcon, 
  Map as MapIcon, 
  Filter, 
  Plus, 
  MoreVertical,
  Activity,
  Fuel,
  Info,
  Search,
  History,
  MapPin,
  QrCode,
  Wrench,
  Upload,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, onSnapshot, query, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { VehicleStatus, Vehicle } from '../types';
import QRScanner from './QRScanner';
import CSVImporter from './CSVImporter';

const statusColors = {
  [VehicleStatus.AVAILABLE]: "bg-emerald-500",
  [VehicleStatus.RENTED]: "bg-[#2563eb]",
  [VehicleStatus.MAINTENANCE]: "bg-amber-500",
  [VehicleStatus.ARCHIVED]: "bg-slate-500",
};

export default function FleetInventory({ setView }: { setView?: (view: string) => void }) {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [filterStatus, setFilterStatus] = React.useState<VehicleStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals & form state
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  
  // Add Asset state
  const [isAddingAsset, setIsAddingAsset] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false);
  const [formMake, setFormMake] = React.useState('');
  const [formModel, setFormModel] = React.useState('');
  const [formYear, setFormYear] = React.useState(new Date().getFullYear());
  const [formPlate, setFormPlate] = React.useState('');
  const [formVin, setFormVin] = React.useState('');
  const [formMileage, setFormMileage] = React.useState(0);
  const [formDailyRate, setFormDailyRate] = React.useState(99);
  const [formHourlyRate, setFormHourlyRate] = React.useState(15);
  const [formFuel, setFormFuel] = React.useState(100);
  const [formStatus, setFormStatus] = React.useState<VehicleStatus>(VehicleStatus.AVAILABLE);

  // Edit Asset details state (handles selected vehicle inline edit)
  const [isEditingAsset, setIsEditingAsset] = React.useState(false);
  const [editMake, setEditMake] = React.useState('');
  const [editModel, setEditModel] = React.useState('');
  const [editYear, setEditYear] = React.useState(2024);
  const [editPlate, setEditPlate] = React.useState('');
  const [editVin, setEditVin] = React.useState('');
  const [editMileage, setEditMileage] = React.useState(0);
  const [editDailyRate, setEditDailyRate] = React.useState(99);
  const [editHourlyRate, setEditHourlyRate] = React.useState(15);
  const [editFuel, setEditFuel] = React.useState(100);
  const [editStatus, setEditStatus] = React.useState<VehicleStatus>(VehicleStatus.AVAILABLE);

  React.useEffect(() => {
    if (!db) return;

    const q = query(collection(db, 'vehicles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vehicleData: Vehicle[] = [];
      snapshot.forEach((doc) => {
        vehicleData.push({ id: doc.id, ...doc.data() } as Vehicle);
      });
      setVehicles(vehicleData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vehicles');
    });

    return () => unsubscribe();
  }, [db]);

  const handleScan = (decodedText: string) => {
    setIsScanning(false);
    const match = vehicles.find(v => v.id === decodedText || v.plateNumber === decodedText || v.vin === decodedText);
    if (match) {
      setSelectedVehicle(match);
      setMaintenanceMode(true);
    } else {
      alert(`No vehicle found matching QR data: ${decodedText}`);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (v.make || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q) ||
        (v.plateNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleImport = async (data: any[]) => {
    if (!db) return;
    let importedCount = 0;
    for (const row of data) {
      const make = row.make || row.Make || row.brand || row.Brand || 'Unknown Make';
      const model = row.model || row.Model || row.vehicle || row.Vehicle || 'Unknown Model';
      const plateNumber = String(row.plateNumber || row['Plate Number'] || row.Plate || row.plate || row['License Plate'] || row.licensePlate || row['License'] || row.license || `UNK-${Math.floor(Math.random() * 9999)}`);
      
      if (Object.keys(row).length > 0) {
        try {
          await addDoc(collection(db, 'vehicles'), {
            make: make,
            model: model,
            plateNumber: plateNumber.toUpperCase(),
            vin: row.vin || row.VIN || '',
            year: parseInt(row.year || row.Year) || new Date().getFullYear(),
            status: row.status || row.Status || VehicleStatus.AVAILABLE,
            mileage: parseInt(row.mileage || row.Mileage) || 0,
            dailyRate: parseFloat(row.dailyRate || row['Daily Rate']) || 0,
            hourlyRate: parseFloat(row.hourlyRate || row['Hourly Rate']) || 15,
            fuelLevel: parseInt(row.fuelLevel || row['Fuel Level']) || 100,
            createdAt: new Date().toISOString()
          });
          importedCount++;
        } catch (e) {
          console.error("Error importing vehicle", e);
        }
      }
    }
    alert(`Successfully imported ${importedCount} vehicles from CSV.`);
  };

  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMake || !formModel || !formPlate) {
      alert("Please fill in all required fields (Make, Model, License Plate)");
      return;
    }

    try {
      await addDoc(collection(db, 'vehicles'), {
        make: formMake,
        model: formModel,
        year: formYear,
        plateNumber: formPlate.toUpperCase(),
        vin: formVin,
        mileage: formMileage,
        dailyRate: formDailyRate,
        hourlyRate: formHourlyRate,
        fuelLevel: formFuel,
        status: formStatus,
        createdAt: new Date().toISOString()
      });
      setIsAddingAsset(false);
      // Reset
      setFormMake('');
      setFormModel('');
      setFormPlate('');
      setFormVin('');
      setFormMileage(0);
      setFormDailyRate(99);
      setFormFuel(100);
      setFormStatus(VehicleStatus.AVAILABLE);
    } catch (e) {
      console.error("Failed to add vehicle:", e);
      alert("Error adding asset to Firestore");
    }
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditMake(v.make || '');
    setEditModel(v.model || '');
    setEditYear(v.year || 2024);
    setEditPlate(v.plateNumber || '');
    setEditVin(v.vin || '');
    setEditMileage(v.mileage || 0);
    setEditDailyRate(v.dailyRate || 99);
    setEditHourlyRate(v.hourlyRate || 15);
    setEditFuel(v.fuelLevel ?? 100);
    setEditStatus(v.status || VehicleStatus.AVAILABLE);
    setIsEditingAsset(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      await updateDoc(doc(db, 'vehicles', selectedVehicle.id), {
        make: editMake,
        model: editModel,
        year: editYear,
        plateNumber: editPlate.toUpperCase(),
        vin: editVin,
        mileage: editMileage,
        dailyRate: editDailyRate,
        hourlyRate: editHourlyRate,
        fuelLevel: editFuel,
        status: editStatus
      });
      setSelectedVehicle({
        ...selectedVehicle,
        make: editMake,
        model: editModel,
        year: editYear,
        plateNumber: editPlate.toUpperCase(),
        vin: editVin,
        mileage: editMileage,
        dailyRate: editDailyRate,
        hourlyRate: editHourlyRate,
        fuelLevel: editFuel,
        status: editStatus
      });
      setIsEditingAsset(false);
    } catch (e) {
      console.error("Failed to update asset:", e);
      alert("Error updating asset info");
    }
  };

  const [confirmSingleDelete, setConfirmSingleDelete] = React.useState(false);

  const handleDeleteAsset = async (vehicleId: string) => {
    if (!confirmSingleDelete) {
      setConfirmSingleDelete(true);
      setTimeout(() => setConfirmSingleDelete(false), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      setSelectedVehicle(null);
      setMaintenanceMode(false);
      setIsEditingAsset(false);
      setConfirmSingleDelete(false);
    } catch (e) {
      console.error("Failed to delete asset:", e);
      alert("Error deleting vehicle asset");
    }
  };

  const counts = {
    available: vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length,
    rented: vehicles.filter(v => v.status === VehicleStatus.RENTED).length,
    maintenance: vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length,
    archived: vehicles.filter(v => v.status === VehicleStatus.ARCHIVED).length,
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Fleet</h1>
          <p className="text-zinc-500 text-sm mt-1">Real-time status and telemetry of all vehicles.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {selectedIds.size > 0 && (
            <button 
              onClick={async () => {
                if (!confirmBulkDelete) {
                  setConfirmBulkDelete(true);
                  setTimeout(() => setConfirmBulkDelete(false), 3000);
                  return;
                }
                
                try {
                  const promises = Array.from(selectedIds).map(async (id) => {
                    return deleteDoc(doc(db, 'vehicles', id));
                  });
                  await Promise.all(promises);
                  setSelectedIds(new Set());
                  setConfirmBulkDelete(false);
                } catch (e) {
                  console.error("Failed to bulk delete", e);
                  alert("Error bulk deleting vehicles");
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors mr-2 whitespace-nowrap"
            >
              <Trash2 size={14} /> {confirmBulkDelete ? 'Click to Confirm' : `Delete (${selectedIds.size})`}
            </button>
          )}

          <button 
            onClick={() => {
              if (selectedIds.size === filteredVehicles.length && filteredVehicles.length > 0) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(filteredVehicles.map(v => v.id)));
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-[#27272a] text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors"
          >
            {selectedIds.size === filteredVehicles.length && filteredVehicles.length > 0 ? 'Deselect All' : 'Select All'}
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111113] border border-[#27272a] rounded-lg py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest text-white outline-none w-48 placeholder:text-zinc-600 focus:border-zinc-500 transition-colors"
            />
          </div>
          <div className="flex bg-[#111113] border border-[#27272a] rounded-lg items-center px-3">
             <Filter size={14} className="text-zinc-500 mr-2" />
             <select 
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value as VehicleStatus | 'all')}
               className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-white outline-none border-none py-2 cursor-pointer appearance-none"
             >
               <option value="all">All Vehicles</option>
               <option value={VehicleStatus.AVAILABLE}>Available</option>
               <option value={VehicleStatus.RENTED}>Rented</option>
               <option value={VehicleStatus.MAINTENANCE}>Maintenance</option>
               <option value={VehicleStatus.ARCHIVED}>Archived</option>
             </select>
          </div>
          <button 
            onClick={() => setIsScanning(true)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-[#27272a] text-white rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors"
          >
            <QrCode size={14} /> Scan ID
          </button>
          <button 
            onClick={() => setIsAddingAsset(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            <Plus size={14} /> Add Vehicle
          </button>
          <CSVImporter 
            onImport={handleImport} 
            label="Import" 
            instructions={
              <div className="space-y-2">
                <p>Upload a CSV or Excel file to bulk import vehicles.</p>
                <p>The system requires your file to match these exact column headers:</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-400 font-mono">
                  <li><strong>make</strong> or <strong>Brand</strong></li>
                  <li><strong>model</strong> or <strong>Vehicle</strong></li>
                  <li><strong>plateNumber</strong> or <strong>License Plate</strong></li>
                  <li><strong>vin</strong></li>
                  <li><strong>year</strong></li>
                  <li><strong>status</strong> (e.g. available, rented)</li>
                  <li><strong>mileage</strong></li>
                  <li><strong>dailyRate</strong></li>
                  <li><strong>hourlyRate</strong></li>
                  <li><strong>fuelLevel</strong> (0-100)</li>
                </ul>
                <p className="text-xs text-blue-400 mt-2">Any missing data will be filled with unknown or default values.</p>
              </div>
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button 
          onClick={() => setFilterStatus(filterStatus === VehicleStatus.AVAILABLE ? 'all' : VehicleStatus.AVAILABLE)}
          className={cn(
            "p-4 bg-[#111113] rounded-xl border flex flex-col text-left transition-colors cursor-pointer",
            filterStatus === VehicleStatus.AVAILABLE ? "border-emerald-500/50 bg-emerald-500/5" : "border-[#27272a] hover:border-zinc-700"
          )}
        >
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Available</span>
          <span className="text-2xl font-black text-white">{counts.available}</span>
        </button>
        <button 
          onClick={() => setFilterStatus(filterStatus === VehicleStatus.RENTED ? 'all' : VehicleStatus.RENTED)}
          className={cn(
            "p-4 bg-[#111113] rounded-xl border flex flex-col text-left transition-colors cursor-pointer",
            filterStatus === VehicleStatus.RENTED ? "border-amber-500/50 bg-amber-500/5" : "border-[#27272a] hover:border-zinc-700"
          )}
        >
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Rented</span>
          <span className="text-2xl font-black text-white">{counts.rented}</span>
        </button>
        <button 
          onClick={() => setFilterStatus(filterStatus === VehicleStatus.MAINTENANCE ? 'all' : VehicleStatus.MAINTENANCE)}
          className={cn(
            "p-4 bg-[#111113] rounded-xl border flex flex-col text-left transition-colors cursor-pointer",
            filterStatus === VehicleStatus.MAINTENANCE ? "border-rose-500/50 bg-rose-500/5" : "border-[#27272a] hover:border-zinc-700"
          )}
        >
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Maintenance</span>
          <span className="text-2xl font-black text-white">{counts.maintenance}</span>
        </button>
        <button 
          onClick={() => setFilterStatus(filterStatus === VehicleStatus.ARCHIVED ? 'all' : VehicleStatus.ARCHIVED)}
          className={cn(
            "p-4 bg-[#111113] rounded-xl border flex flex-col text-left transition-colors cursor-pointer",
            filterStatus === VehicleStatus.ARCHIVED ? "border-zinc-500/50 bg-zinc-500/5" : "border-[#27272a] hover:border-zinc-700"
          )}
        >
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Archived</span>
          <span className="text-2xl font-black text-white">{counts.archived}</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-96 bg-[#111113] animate-pulse rounded-xl border border-[#27272a]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVehicles.map((v) => (
            <motion.div 
              key={v.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              onClick={(e: any) => {
                // If user clicked the checkbox, don't open the modal
                if (e.target.type === 'checkbox') return;
                setSelectedVehicle(v);
              }}
              className={cn(
                "group border rounded-xl overflow-hidden transition-all cursor-pointer relative",
                selectedIds.has(v.id) ? "border-blue-500 bg-[#11111a]" : "bg-[#09090b] border-[#27272a] hover:border-zinc-700"
              )}
            >
              <div className="absolute top-4 right-4 z-20">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-blue-500 cursor-pointer"
                  checked={selectedIds.has(v.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    const newSet = new Set(selectedIds);
                    if (newSet.has(v.id)) {
                      newSet.delete(v.id);
                    } else {
                      newSet.add(v.id);
                    }
                    setSelectedIds(newSet);
                  }}
                />
              </div>
              <div className="aspect-[16/10] bg-zinc-900 relative overflow-hidden flex items-center justify-center p-8">
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter text-white/90 flex items-center gap-1.5 backdrop-blur-md border border-white/5",
                    statusColors[v.status] + "/40"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full bg-white", v.status === VehicleStatus.AVAILABLE && "animate-pulse")} />
                    {v.status}
                  </span>
                  <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter text-zinc-500 bg-black/20 border border-white/5">
                    {v.year}
                  </span>
                </div>
                
                <CarIcon size={120} strokeWidth={0.5} className="text-zinc-800 scale-125 rotate-[-12deg] group-hover:scale-135 group-hover:text-zinc-700 transition-all duration-700 opacity-40" />

                <div className="absolute bottom-4 right-4 z-10 font-mono text-[9px] text-zinc-600 font-bold bg-[#111113]/80 px-2 py-0.5 rounded border border-white/5 uppercase">
                  {v.plateNumber || 'ID-REK'}
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-[#fafafa] tracking-tight tabular-nums">{v.make} {v.model}</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <p className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-widest">{v.plateNumber}</p>
                       <span className="text-zinc-800 tracking-tighter text-[10px] font-black">/</span>
                       <p className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter underline underline-offset-4 decoration-zinc-800">Fleet Control</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedVehicle(v); setMaintenanceMode(true); }} className="text-zinc-500 hover:text-white transition-colors" title="Maintenance Log">
                    <Wrench size={16} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <Fuel size={12} className="text-zinc-500" />
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Energy Level</span>
                      </div>
                      <span className="text-[10px] font-black text-white tabular-nums">{v.fuelLevel ?? 0}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                        style={{ width: `${v.fuelLevel ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-[#27272a]">
                    <div className="flex items-center gap-2">
                      <Activity size={12} className="text-zinc-500" />
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Odometer</span>
                    </div>
                    <span className="text-xs font-black text-zinc-400 tabular-nums">{(v.mileage ?? 0).toLocaleString()} <span className="text-[10px] text-zinc-700 uppercase">MI</span></span>
                  </div>
                </div>

                <div className="mt-8 flex gap-2">
                  <button className="flex-1 py-2.5 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-850 hover:text-white transition-all flex items-center justify-center gap-2">
                    <MapIcon size={12} /> Locate
                  </button>
                  <button className="flex-[1.5] py-2.5 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl">
                    Manage Vehicle
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {isScanning && <QRScanner onScan={handleScan} onClose={() => setIsScanning(false)} />}

      {/* Add Asset Modal */}
      {isAddingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-[#27272a] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsAddingAsset(false)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-4">
              Add Vehicle
            </h3>

            <form onSubmit={handleAddAssetSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Make (e.g. Ford)</label>
                  <input 
                    type="text"
                    value={formMake}
                    onChange={e => setFormMake(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Model (e.g. Transit)</label>
                  <input 
                    type="text"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">VIN (Chassis ID)</label>
                  <input 
                    type="text"
                    value={formVin}
                    onChange={e => setFormVin(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Year</label>
                  <input 
                    type="number"
                    value={formYear}
                    onChange={e => setFormYear(parseInt(e.target.value) || 2024)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Plate Number</label>
                  <input 
                    type="text"
                    placeholder="e.g. TX-9011"
                    value={formPlate}
                    onChange={e => setFormPlate(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none font-mono uppercase"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Vehicle Status</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  >
                    <option value={VehicleStatus.AVAILABLE}>Available</option>
                    <option value={VehicleStatus.RENTED}>Rented</option>
                    <option value={VehicleStatus.MAINTENANCE}>Maintenance</option>
                    <option value={VehicleStatus.ARCHIVED}>Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Hourly ($)</label>
                  <input 
                    type="number"
                    value={formHourlyRate}
                    onChange={e => setFormHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Daily ($)</label>
                  <input 
                    type="number"
                    value={formDailyRate}
                    onChange={e => setFormDailyRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Odometer (MI)</label>
                  <input 
                    type="number"
                    value={formMileage}
                    onChange={e => setFormMileage(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Fuel (%)</label>
                  <input 
                    type="number"
                    max={100}
                    min={0}
                    value={formFuel}
                    onChange={e => setFormFuel(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddingAsset(false)}
                  className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-wider"
                >
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Details & inline Edit Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#09090b] border border-[#27272a] p-8 rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isEditingAsset ? "Edit Vehicle Details" : `${selectedVehicle.make} ${selectedVehicle.model}`}
              </h2>
              <button 
                onClick={() => { 
                  setSelectedVehicle(null); 
                  setMaintenanceMode(false); 
                  setIsEditingAsset(false); 
                }} 
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {isEditingAsset ? (
              // EDITING FORM
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Make</label>
                    <input 
                      type="text"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editMake}
                      onChange={e => setEditMake(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Model</label>
                    <input 
                      type="text"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editModel}
                      onChange={e => setEditModel(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">VIN (Chassis ID)</label>
                    <input 
                      type="text"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                      value={editVin}
                      onChange={e => setEditVin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Year</label>
                    <input 
                      type="number"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editYear}
                      onChange={e => setEditYear(parseInt(e.target.value) || 2024)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">License Plate</label>
                    <input 
                      type="text"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono uppercase"
                      value={editPlate}
                      onChange={e => setEditPlate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Current Status</label>
                    <select 
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as any)}
                    >
                      <option value={VehicleStatus.AVAILABLE}>Available</option>
                      <option value={VehicleStatus.RENTED}>Rented</option>
                      <option value={VehicleStatus.MAINTENANCE}>Maintenance</option>
                      <option value={VehicleStatus.ARCHIVED}>Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Hourly Rate ($)</label>
                    <input 
                      type="number"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editHourlyRate}
                      onChange={e => setEditHourlyRate(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Daily Rate ($)</label>
                    <input 
                      type="number"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editDailyRate}
                      onChange={e => setEditDailyRate(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Odometer (MI)</label>
                    <input 
                      type="number"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editMileage}
                      onChange={e => setEditMileage(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Fuel Level (%)</label>
                    <input 
                      type="number"
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                      value={editFuel}
                      onChange={e => setEditFuel(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsEditingAsset(false)}
                    className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-wider"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : maintenanceMode ? (
              // MAINTENANCE PANEL
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-[#111113] border border-[#27272a] rounded-xl flex flex-col gap-1">
                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Next Service</span>
                     <span className="text-sm font-black text-white">5,000 MI</span>
                   </div>
                   <div className="p-4 bg-[#111113] border border-[#27272a] rounded-xl flex flex-col gap-1">
                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tire Health</span>
                     <span className="text-sm font-black text-emerald-500">OPTIMAL</span>
                   </div>
                </div>

                <div className="bg-[#111113] border border-[#27272a] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#27272a] bg-zinc-900/50">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Diagnosed Issues</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-[#27272a]">
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-widest">Change Oil & Filter</p>
                        <p className="text-[10px] font-medium text-zinc-500 mt-1">Routine standard maintenance</p>
                      </div>
                      <span className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded text-[9px] font-black uppercase tracking-widest">Pending</span>
                    </div>
                    <div className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-[#27272a]">
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-widest">Brake Pad Inspection</p>
                        <p className="text-[10px] font-medium text-zinc-500 mt-1">Front left sensor logic</p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black uppercase tracking-widest">Cleared</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={async () => {
                      if (!db) return;
                      await updateDoc(doc(db, 'vehicles', selectedVehicle.id), { status: VehicleStatus.MAINTENANCE });
                      setSelectedVehicle({ ...selectedVehicle, status: VehicleStatus.MAINTENANCE });
                    }}
                    disabled={selectedVehicle.status === VehicleStatus.MAINTENANCE}
                    className="w-full py-4 bg-amber-500 text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50 disabled:bg-amber-500/10 disabled:text-amber-500"
                  >
                    Flag for Maintenance
                  </button>
                  {selectedVehicle.status === VehicleStatus.MAINTENANCE && (
                    <button 
                      onClick={async () => {
                        if (!db) return;
                        await updateDoc(doc(db, 'vehicles', selectedVehicle.id), { status: VehicleStatus.AVAILABLE });
                        setSelectedVehicle({ ...selectedVehicle, status: VehicleStatus.AVAILABLE });
                        setMaintenanceMode(false);
                      }}
                      className="w-full py-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                    >
                      Clear & Release to Fleet
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // VIEWING ORIGINAL DETAILS WITH ACTIONS
              <div>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</span>
                    <span className={cn("text-xs font-black uppercase tracking-tighter text-white", statusColors[selectedVehicle.status].replace('bg-', 'text-'))}>
                      {selectedVehicle.status}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Plate Number</span>
                    <span className="text-sm font-mono text-white tracking-widest font-black uppercase">{selectedVehicle.plateNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">VIN</span>
                    <span className="text-sm font-mono text-white">{selectedVehicle.vin || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Hourly Rate</span>
                    <span className="text-sm font-mono text-white font-black">${selectedVehicle.hourlyRate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Daily Rate</span>
                    <span className="text-sm font-mono text-white font-black">${selectedVehicle.dailyRate || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Odometer</span>
                    <span className="text-sm font-mono text-white">{(selectedVehicle.mileage ?? 0).toLocaleString()} MI</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Coordinates</span>
                    <span className="text-sm font-mono text-white">
                      {selectedVehicle.location ? `${selectedVehicle.location.lat.toFixed(4)}, ${selectedVehicle.location.lng.toFixed(4)}` : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#27272a]">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Year</span>
                    <span className="text-sm font-mono text-white">{selectedVehicle.year}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  {selectedVehicle.location && (
                    <button 
                      onClick={() => {
                        if (setView) {
                          sessionStorage.setItem('targetMapLocation', JSON.stringify(selectedVehicle.location));
                          setView('fleet-map');
                        }
                      }} 
                      className="flex-1 py-3 bg-zinc-900 border border-[#27272a] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <MapPin size={14} /> Center on Map
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (setView) setView('vehicle-history');
                    }}
                    className="flex-1 py-3 bg-zinc-900 border border-[#27272a] text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <History size={14} /> History
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button 
                    onClick={() => handleOpenEdit(selectedVehicle)}
                    className="py-3 bg-zinc-900 border border-[#27272a] text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 hover:text-blue-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit2 size={13} /> Edit Vehicle Details
                  </button>
                  <button 
                    onClick={() => handleDeleteAsset(selectedVehicle.id)}
                    className="py-3 bg-zinc-900 border border-rose-950 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-950/20 hover:text-rose-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={13} /> {confirmSingleDelete ? 'Click to Confirm' : 'Delete Vehicle'}
                  </button>
                </div>

                {selectedVehicle.plateNumber === 'TX-9011' && (
                  <button 
                    onClick={async () => {
                      try {
                        await fetch('/api/admin/toggle-tracking', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ vehicleId: 'TX-9011', enabled: true })
                        });
                        alert("Admin Override: Forced Tracking Enabled for TX-9011");
                      } catch (e) {
                        console.error("Failed to toggle tracking", e);
                      }
                    }}
                    className="w-full mt-3 py-3 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600/20 transition-colors hover:border-indigo-500/50 flex items-center justify-center gap-2"
                  >
                    <Activity size={14} /> Force Tracking Enabled (Demo)
                  </button>
                )}
                {selectedVehicle.plateNumber === 'TX-9011' && (
                  <button 
                    onClick={async () => {
                      try {
                        await fetch('/api/admin/toggle-tracking', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ vehicleId: 'TX-9011', enabled: false })
                        });
                        alert("Admin Override: Forced Tracking Disabled for TX-9011");
                      } catch (e) {
                        console.error("Failed to toggle tracking", e);
                      }
                    }}
                    className="w-full mt-3 py-3 bg-rose-600/10 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-600/20 transition-colors hover:border-rose-500/50 flex items-center justify-center gap-2"
                  >
                    <X size={14} /> Force Tracking Disabled (Demo)
                  </button>
                )}

                <button 
                  onClick={() => setMaintenanceMode(true)}
                  className="w-full mt-3 py-3 bg-amber-600/10 border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600/20 transition-colors hover:border-amber-500/50 flex items-center justify-center gap-2"
                >
                  <Wrench size={14} /> Open Maintenance Panel
                </button>
              </div>
            )}
            
            {!isEditingAsset && (
              <button 
                onClick={() => { 
                  setSelectedVehicle(null); 
                  setMaintenanceMode(false); 
                }} 
                className="w-full mt-4 py-3 bg-[#111113] border border-[#27272a] text-zinc-400 rounded-lg text-[10px] font-black hover:bg-zinc-900 transition-colors uppercase tracking-widest"
              >
                Close Details
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
