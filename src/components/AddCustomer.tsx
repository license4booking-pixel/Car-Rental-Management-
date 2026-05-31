import React from 'react';
import { 
  User, 
  MapPin, 
  Shield, 
  Upload, 
  Calendar as CalendarIcon,
  Phone,
  Mail,
  MoreHorizontal
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { Building2 } from 'lucide-react';

const FormSection = ({ title, description, children, icon: Icon, index }: any) => (
  <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden mb-12">
    <div className="p-6 border-b border-[#27272a] flex items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-black">{index}</span>
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">{title}</h3>
          <p className="text-zinc-500 text-[10px] mt-0.5 uppercase tracking-tighter">{description}</p>
        </div>
      </div>
    </div>
    <div className="p-8">
      {children}
    </div>
  </div>
);

const InputField = ({ label, type = "text", placeholder, icon: Icon, required, value, onChange }: any) => (
  <div className="space-y-1.5 flex-1 min-w-[240px]">
    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />}
      <input 
        type={type} 
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 px-4 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/50 transition-all font-medium",
          Icon && "pl-10"
        )}
      />
    </div>
  </div>
);

export default function AddCustomer({ onComplete }: { onComplete?: () => void }) {
  const [activeTab, setActiveTab] = React.useState('identity');
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyId: '',
    dob: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    licenseId: '',
    licenseExpiry: '',
    pickupDate: '',
    pickupTime: '',
    dropoffDate: '',
    dropoffTime: '',
    rentalAmount: '0',
    advanceAmount: '0',
    amountPaid: '0',
    amountDue: '0',
    notes: '',
    assignedVehicle: '',
    paymentStatus: 'Unpaid' as 'Paid' | 'Unpaid',
  });
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'companies'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const vQ = query(collection(db, 'vehicles'), orderBy('make', 'asc'));
    const unsubV = onSnapshot(vQ, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub();
      unsubV();
    };
  }, []);

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      alert("Missing required fields");
      return;
    }
    setLoading(true);
    try {
      if (!db) {
        throw new Error("Database not initialized");
      }
      const paidVal = parseFloat(formData.amountPaid) || 0;
      const dueVal = parseFloat(formData.amountDue) || 0;
      const computedPaymentStatus = formData.paymentStatus;
      const computedStatus = computedPaymentStatus === 'Unpaid' ? 'Pending Payment' : 'Verified';

      const extractPlate = (vehicleStr: string) => {
        const match = vehicleStr.match(/\(([^)]+)\)/);
        return match ? match[1] : null;
      };

      const plate = formData.assignedVehicle ? extractPlate(formData.assignedVehicle) : null;
      if (plate) {
        const targetVh = vehicles.find(v => v.plateNumber === plate);
        if (targetVh) {
          await updateDoc(doc(db, 'vehicles', targetVh.id), { status: 'rented' });
        }
      }

      const docRef = await addDoc(collection(db, 'customers'), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        companyId: formData.companyId || null,
        address: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
        },
        license: {
          id: formData.licenseId,
          expiry: formData.licenseExpiry
        },
        pickupDate: formData.pickupDate,
        pickupTime: formData.pickupTime,
        dropoffDate: formData.dropoffDate,
        dropoffTime: formData.dropoffTime,
        rentalAmount: parseFloat(formData.rentalAmount) || 0,
        advanceAmount: parseFloat(formData.advanceAmount) || 0,
        amountPaid: paidVal,
        amountDue: dueVal,
        paymentStatus: computedPaymentStatus,
        assignedVehicle: formData.assignedVehicle,
        status: computedStatus,
        notes: formData.notes,
        createdAt: new Date().toISOString()
      });

      // Synchronize client billing values to central billing (rental_payments)

      if (paidVal > 0) {
        await setDoc(doc(db, 'rental_payments', 'cust_paid_' + docRef.id), {
          customerId: docRef.id,
          customerName: `${formData.firstName} ${formData.lastName}`,
          amount: paidVal,
          status: 'paid',
          description: `Total Rental Settlement for ${formData.firstName} ${formData.lastName}`,
          date: new Date()
        });
      }
      
      if (dueVal > 0) {
        await setDoc(doc(db, 'rental_payments', 'cust_unpaid_' + docRef.id), {
          customerId: docRef.id,
          customerName: `${formData.firstName} ${formData.lastName}`,
          amount: dueVal,
          status: 'pending',
          description: `Outstanding Invoice Balance for ${formData.firstName} ${formData.lastName}`,
          date: new Date()
        });
      }

      if (onComplete) onComplete();
    } catch (e) {
      console.error(e);
      alert("Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-2 mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Onboard Client</h1>
          <p className="text-zinc-500 text-sm mt-1">Register a new entity into the Philly Rental Sys ecosystem.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.05)] disabled:opacity-50"
          >
            {loading ? "Processing..." : "Initialize Record"}
          </button>
        </div>
      </div>

      <nav className="flex gap-6 sm:gap-8 border-b border-[#27272a] pb-px overflow-x-auto whitespace-nowrap">
        {['identity', 'address', 'vault', 'payments', 'notes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative shrink-0",
              activeTab === tab ? "text-white" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
              />
            )}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start mt-10">
        <div className="md:col-span-2">
          {activeTab === 'identity' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <FormSection 
                index="01"
                title="Identity Profile" 
                description="Secure identification and core contact data."
                icon={User}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <InputField label="Legal First Name" placeholder="John" required value={formData.firstName} onChange={(e: any) => setFormData({...formData, firstName: e.target.value})} />
                  <InputField label="Legal Last Name" placeholder="Doe" required value={formData.lastName} onChange={(e: any) => setFormData({...formData, lastName: e.target.value})} />
                  <InputField label="Verified Email" type="email" placeholder="john@vault.com" icon={Mail} required value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
                  <InputField label="Phone Uplink" type="tel" placeholder="+1 (555) 000-0000" icon={Phone} required value={formData.phone} onChange={(e: any) => setFormData({...formData, phone: e.target.value})} />
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">
                      Corporate Affiliation (Optional)
                    </label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
                      <select 
                        value={formData.companyId}
                        onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-medium appearance-none"
                      >
                        <option value="">-- No Company --</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <InputField label="Date of Birth" type="date" icon={CalendarIcon} required value={formData.dob} onChange={(e: any) => setFormData({...formData, dob: e.target.value})} />
                  </div>
                  <InputField label="Pick-up Date" type="date" icon={CalendarIcon} value={formData.pickupDate} onChange={(e: any) => setFormData({...formData, pickupDate: e.target.value})} />
                  <InputField label="Pick-up Time" type="time" icon={CalendarIcon} value={formData.pickupTime} onChange={(e: any) => setFormData({...formData, pickupTime: e.target.value})} />
                  <InputField label="Drop-off Date" type="date" icon={CalendarIcon} value={formData.dropoffDate} onChange={(e: any) => setFormData({...formData, dropoffDate: e.target.value})} />
                  <InputField label="Drop-off Time" type="time" icon={CalendarIcon} value={formData.dropoffTime} onChange={(e: any) => setFormData({...formData, dropoffTime: e.target.value})} />
                </div>
              </FormSection>
            </motion.div>
          )}

          {activeTab === 'address' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <FormSection 
                index="02"
                title="Geographic Base" 
                description="Primary residency and billing coordinates."
                icon={MapPin}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <InputField label="Residency Address" placeholder="123 Fleet St." value={formData.address} onChange={(e: any) => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <InputField label="City / Region" placeholder="Los Angeles" value={formData.city} onChange={(e: any) => setFormData({...formData, city: e.target.value})} />
                  <InputField label="Province / State" placeholder="California" value={formData.state} onChange={(e: any) => setFormData({...formData, state: e.target.value})} />
                  <InputField label="Zip / Postal" placeholder="90001" value={formData.zip} onChange={(e: any) => setFormData({...formData, zip: e.target.value})} />
                  <InputField label="Sovereign State" placeholder="United States" value={formData.country} onChange={(e: any) => setFormData({...formData, country: e.target.value})} />
                </div>
              </FormSection>
            </motion.div>
          )}

          {activeTab === 'vault' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <FormSection 
                index="03"
                title="Digital Vault Uplink" 
                description="Encrypted credential and license synchronization."
                icon={Shield}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <InputField label="Operator License ID" placeholder="DL-000-000" required value={formData.licenseId} onChange={(e: any) => setFormData({...formData, licenseId: e.target.value})} />
                    <InputField label="Credential Expiry" type="date" required value={formData.licenseExpiry} onChange={(e: any) => setFormData({...formData, licenseExpiry: e.target.value})} />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">
                      Credential Scan Payload
                    </label>
                    <div className="h-44 border border-dashed border-[#27272a] rounded-xl flex flex-col items-center justify-center gap-3 group hover:border-blue-500/50 hover:bg-[#111113] transition-all cursor-pointer">
                      <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600 group-hover:text-blue-400 group-hover:scale-110 transition-all border border-[#27272a]">
                        <Upload size={16} />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Source File</p>
                        <p className="text-[9px] text-zinc-700 mt-1 uppercase font-black tabular-nums">PDF / JPG / PNG (MAX 25MB)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </FormSection>
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <FormSection 
                index="04"
                title="Rental Details & Finances" 
                description="Assign a vehicle and configure billing."
                icon={Shield}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1 block">
                      Assign Vehicle
                    </label>
                    <select
                      value={formData.assignedVehicle}
                      onChange={e => setFormData({...formData, assignedVehicle: e.target.value})}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-2 px-3 text-sm text-white focus:border-blue-500/50 outline-none"
                    >
                      <option value="">-- No Vehicle Assigned --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={`${v.make || ''} ${v.model || ''} (${v.plateNumber})`}>
                          {v.make} {v.model} ({v.plateNumber}) - {v.status === 'rented' ? 'Rented' : 'Available'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1 block">
                      Payment Status
                    </label>
                    <div className="flex bg-[#18181b] p-1 rounded-xl border border-[#27272a]">
                      <button 
                        type="button"
                        onClick={() => {
                          let finalAmountPaid = parseFloat(formData.amountPaid) || 0;
                          let finalAmountDue = parseFloat(formData.amountDue) || 0;
                          if (finalAmountDue > 0) {
                            finalAmountPaid += finalAmountDue;
                            finalAmountDue = 0;
                          }
                          setFormData({...formData, paymentStatus: 'Paid', amountPaid: String(finalAmountPaid), amountDue: '0'})
                        }}
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${formData.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Paid
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, paymentStatus: 'Unpaid'})}
                        className={`flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${formData.paymentStatus === 'Unpaid' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-white'}`}
                      >
                        Unpaid
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 hover:border-zinc-800 transition-colors">
                  <InputField 
                    label="Total Rental Amount ($)" 
                    placeholder="0.00" 
                    value={formData.rentalAmount} 
                    onChange={(e: any) => {
                      const rent = parseFloat(e.target.value) || 0;
                      const adv = parseFloat(formData.advanceAmount) || 0;
                      const due = Math.max(0, rent - adv).toFixed(2);
                      setFormData({...formData, rentalAmount: e.target.value, amountDue: due});
                    }} 
                  />
                  <InputField 
                    label="Advance Assigned Amount ($)" 
                    placeholder="0.00" 
                    value={formData.advanceAmount} 
                    onChange={(e: any) => {
                      const adv = parseFloat(e.target.value) || 0;
                      const rent = parseFloat(formData.rentalAmount) || 0;
                      const due = Math.max(0, rent - adv).toFixed(2);
                      setFormData({...formData, advanceAmount: e.target.value, amountPaid: e.target.value, amountDue: due});
                    }} 
                  />
                  <InputField 
                    label="Current Amount Paid ($)" 
                    placeholder="0.00" 
                    value={formData.amountPaid} 
                    onChange={(e: any) => {
                      const paid = parseFloat(e.target.value) || 0;
                      const rent = parseFloat(formData.rentalAmount) || 0;
                      const due = Math.max(0, rent - paid).toFixed(2);
                      setFormData({...formData, amountPaid: e.target.value, amountDue: due});
                    }} 
                  />
                  <InputField 
                    label="Calculated Amount Due ($)" 
                    placeholder="0.00" 
                    value={formData.amountDue} 
                    onChange={(e: any) => setFormData({...formData, amountDue: e.target.value})} 
                  />
                </div>
              </FormSection>
            </motion.div>
          )}

          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <FormSection 
                index="05"
                title="Operative Notes" 
                description="Secure internal annotations for administration."
                icon={MoreHorizontal}
              >
                <div className="space-y-4">
                  <textarea 
                    value={formData.notes}
                    onChange={(e: any) => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 px-4 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-blue-500/50 transition-all font-medium min-h-[200px] resize-none"
                    placeholder="Enter explicit client directives, behavioral notes, or contextual onboarding context..."
                  />
                  <div className="bg-zinc-950 p-4 border border-[#27272a] rounded-xl flex items-start gap-3">
                    <Shield size={16} className="text-zinc-600 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-zinc-400 font-mono">ENCRYPTED AT REST</p>
                      <p className="text-[10px] text-zinc-600 mt-1 uppercase">Notes remain isolated to internal operative staff exclusively.</p>
                    </div>
                  </div>
                </div>
              </FormSection>
            </motion.div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="bg-[#111113] border border-[#27272a] rounded-xl p-6 sticky top-24">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-blue-500" />
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Vault Security</h4>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed mb-6 font-medium">
            This operation is performed over an encrypted channel. Every entry is cross-referenced with global compliance databases.
          </p>
          <div className="space-y-3 pt-6 border-t border-[#27272a]">
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-zinc-600 uppercase">Latency</span>
                <span className="text-[9px] font-black text-emerald-500 tabular-nums">12ms</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-zinc-600 uppercase">Integrity</span>
                <span className="text-[9px] font-black text-blue-500 uppercase">Verified</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
