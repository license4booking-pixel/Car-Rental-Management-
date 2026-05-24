import React from 'react';
import { Plus, Search, FileText, UserCircle, CheckCircle2, Edit2, Trash2, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import AddCustomer from './AddCustomer';
import CSVImporter from './CSVImporter';
import { cn } from '../lib/utils';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: string;
}

export default function CustomerManagement() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // Editing Client state
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [formFirstName, setFormFirstName] = React.useState('');
  const [formLastName, setFormLastName] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formStatus, setFormStatus] = React.useState('Verified');
  const [formAddress, setFormAddress] = React.useState('');
  const [formCity, setFormCity] = React.useState('');
  const [formState, setFormState] = React.useState('');
  const [formZip, setFormZip] = React.useState('');
  const [formCountry, setFormCountry] = React.useState('');
  const [formDob, setFormDob] = React.useState('');
  const [formLicenseId, setFormLicenseId] = React.useState('');

  React.useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
      setCustomers(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error watching customers collection:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleImport = async (data: any[]) => {
    if (!db) return;
    let importedCount = 0;
    for (const row of data) {
      if (row.firstName && row.lastName && row.email) {
        try {
          await addDoc(collection(db, 'customers'), {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone || '',
            status: row.status || 'Verified',
            address: row.address || '',
            createdAt: new Date().toISOString()
          });
          importedCount++;
        } catch (e) {
          console.error("Error importing customer", e);
        }
      }
    }
    alert(`Successfully imported ${importedCount} customers from CSV.`);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormFirstName(customer.firstName);
    setFormLastName(customer.lastName);
    setFormEmail(customer.email);
    setFormPhone(customer.phone || '');
    setFormStatus(customer.status || 'Verified');
    
    const anyC = customer as any;
    setFormAddress(anyC.address?.street || anyC.address || '');
    setFormCity(anyC.address?.city || anyC.city || '');
    setFormState(anyC.address?.state || anyC.state || '');
    setFormZip(anyC.address?.zip || anyC.zip || '');
    setFormCountry(anyC.address?.country || anyC.country || '');
    setFormDob(anyC.dob || '');
    setFormLicenseId(anyC.licenseId || '');
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to purge this client record from the database? This action is irreversible.")) return;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (e) {
      console.error("Failed to delete client:", e);
      alert("Failed to delete client catalog folder.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      await updateDoc(doc(db, 'customers', editingCustomer.id), {
        firstName: formFirstName,
        lastName: formLastName,
        email: formEmail,
        phone: formPhone,
        status: formStatus,
        address: {
          street: formAddress,
          city: formCity,
          state: formState,
          zip: formZip,
          country: formCountry
        },
        dob: formDob,
        licenseId: formLicenseId
      });
      setEditingCustomer(null);
    } catch (e) {
      console.error("Error updating customer:", e);
      alert("Failed to update customer details.");
    }
  };

  if (isAddingNew) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setIsAddingNew(false)}
          className="text-[10px] uppercase font-black tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          ← Return to Directory
        </button>
        <AddCustomer onComplete={() => setIsAddingNew(false)} />
      </div>
    );
  }

  const filtered = customers.filter(c => 
    (c.firstName + ' ' + c.lastName).toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Directory</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage client records, identities, and agreements.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setIsAddingNew(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} /> New Record
          </button>
          <div className="flex-1 sm:flex-none">
            <CSVImporter onImport={handleImport} label="Import" className="w-full justify-center" />
          </div>
        </div>
      </div>

      <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search records..."
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
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Client</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Vault Assets</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    Loading client files...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No customers found in database.
                  </td>
                </tr>
              ) : (
                filtered.map(customer => (
                  <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#27272a] flex items-center justify-center text-zinc-400 uppercase font-black text-xs">
                          {customer.firstName?.[0] || '?'}{customer.lastName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{customer.firstName} {customer.lastName}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">ID: {customer.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <p className="text-xs text-white">{customer.email}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{customer.phone || 'No phone recorded'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider",
                        customer.status === 'Blacklisted' 
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
                          : customer.status === 'Unverified' 
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      )}>
                        <CheckCircle2 size={10} /> {customer.status || 'Verified'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                         <button className="px-2 py-1 bg-zinc-900 border border-[#27272a] rounded flex items-center gap-1.5 hover:border-blue-500/50 transition-colors group/btn">
                           <FileText size={12} className="text-zinc-500 group-hover/btn:text-blue-400" />
                           <span className="text-[9px] font-bold text-zinc-400 uppercase">Agreement.pdf</span>
                         </button>
                         <button className="px-2 py-1 bg-zinc-900 border border-[#27272a] rounded flex items-center gap-1.5 hover:border-purple-500/50 transition-colors group/btn">
                           <UserCircle size={12} className="text-zinc-500 group-hover/btn:text-purple-400" />
                           <span className="text-[9px] font-bold text-zinc-400 uppercase">Gov ID.jpg</span>
                         </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" 
                          title="Edit Customer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/15 rounded transition-colors" 
                          title="Purge Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-[#27272a] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setEditingCustomer(null)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-4">
              Edit Client Profile
            </h3>

            <form onSubmit={handleUpdate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">First Name</label>
                  <input 
                    type="text"
                    value={formFirstName}
                    onChange={e => setFormFirstName(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Last Name</label>
                  <input 
                    type="text"
                    value={formLastName}
                    onChange={e => setFormLastName(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Email Address</label>
                <input 
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Residency Address</label>
                <input 
                  type="text"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">City</label>
                  <input 
                    type="text"
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">State</label>
                  <input 
                    type="text"
                    value={formState}
                    onChange={e => setFormState(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Date of Birth</label>
                  <input 
                    type="date"
                    value={formDob}
                    onChange={e => setFormDob(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">License ID</label>
                  <input 
                    type="text"
                    value={formLicenseId}
                    onChange={e => setFormLicenseId(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Phone Connection</label>
                  <input 
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Identity Status</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Unverified">Unverified</option>
                    <option value="Blacklisted">Blacklisted</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-wider"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
