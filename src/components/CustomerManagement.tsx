import React from 'react';
import { Plus, Search, FileText, UserCircle, CheckCircle2, Edit2, Trash2, X, UploadCloud } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import AddCustomer from './AddCustomer';
import CSVImporter from './CSVImporter';
import PaymentToggle from './PaymentToggle';
import { cn } from '../lib/utils';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status?: string;
  pickupDate?: string;
  pickupTime?: string;
  dropoffDate?: string;
  dropoffTime?: string;
  createdAt?: string;
  amountPaid?: number;
  amountDue?: number;
  assignedVehicle?: string;
  paymentStatus?: 'Paid' | 'Unpaid';
  vehicleHistory?: { vehicle: string; switchedAt: string }[];
  rentalAmount?: number;
  advanceAmount?: number;
  notes?: string;
}

export default function CustomerManagement({ isArchive = false }: { isArchive?: boolean }) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = React.useState(false);

  // Editing Client state
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = React.useState<string | null>(null);
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
  const [formCompanyId, setFormCompanyId] = React.useState('');
  const [formPickupDate, setFormPickupDate] = React.useState('');
  const [formPickupTime, setFormPickupTime] = React.useState('');
  const [formDropoffDate, setFormDropoffDate] = React.useState('');
  const [formDropoffTime, setFormDropoffTime] = React.useState('');
  const [formRentalAmount, setFormRentalAmount] = React.useState('0');
  const [formAdvanceAmount, setFormAdvanceAmount] = React.useState('0');
  const [formAmountPaid, setFormAmountPaid] = React.useState('0');
  const [formAmountDue, setFormAmountDue] = React.useState('0');
  const [formPayInput, setFormPayInput] = React.useState('');
  const [companies, setCompanies] = React.useState<any[]>([]);
  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [formAssignedVehicle, setFormAssignedVehicle] = React.useState('');
  const [formPaymentStatus, setFormPaymentStatus] = React.useState<'Paid' | 'Unpaid'>('Unpaid');
  const [activeTab, setActiveTab] = React.useState<'personal' | 'rental' | 'billing' | 'notes'>('personal');
  const [formNotes, setFormNotes] = React.useState('');
  const [payments, setPayments] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!db) return;
    const q = query(collection(db as any, 'customers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
      fetched.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dbTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dbTime - da;
      });
      setCustomers(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error watching customers collection:", error);
      setLoading(false);
    });

    const cq = query(collection(db as any, 'companies'), orderBy('name', 'asc'));
    const cUnsub = onSnapshot(cq, (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const vq = query(collection(db as any, 'vehicles'));
    const vUnsub = onSnapshot(vq, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const pq = query(collection(db as any, 'rental_payments'));
    const pUnsub = onSnapshot(pq, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error watching rental_payments:", error);
    });

    const handleOpenNew = (e: any) => {
      if (e.detail === 'customer') setIsAddingNew(true);
    };
    window.addEventListener('open-new-record', handleOpenNew);

    return () => {
      unsubscribe();
      cUnsub();
      vUnsub();
      pUnsub();
      window.removeEventListener('open-new-record', handleOpenNew);
    };
  }, []);

  React.useEffect(() => {
    if (!editingCustomer) return;
    const liveCust = customers.find(c => c.id === editingCustomer.id);
    if (liveCust) {
      setFormAmountPaid(String(liveCust.amountPaid ?? 0));
      setFormAmountDue(String(liveCust.amountDue ?? 0));
      setFormPaymentStatus(liveCust.paymentStatus || 'Unpaid');
      setFormStatus(liveCust.status || 'Verified');
    }
  }, [payments, customers, editingCustomer?.id]);

  const handleImport = async (data: any[]) => {
    if (!db) return;
    let importedCount = 0;
    for (const row of data) {
      const firstName = row.firstName || (row.Name ? row.Name.split(' ')[0] : '');
      const lastName = row.lastName || (row.Name ? row.Name.split(' ').slice(1).join(' ') : '');
      const email = row.email || row.Email || '';
      
      if (firstName && email) {
        try {
          await addDoc(collection(db as any, 'customers'), {
            firstName,
            lastName,
            email,
            phone: row.phone || row.Contact || '',
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
    setFormCompanyId(anyC.companyId || '');
    setFormPickupDate(anyC.pickupDate || '');
    setFormPickupTime(anyC.pickupTime || '');
    setFormDropoffDate(anyC.dropoffDate || '');
    setFormDropoffTime(anyC.dropoffTime || '');
    setFormRentalAmount(String(anyC.rentalAmount ?? 0));
    setFormAdvanceAmount(String(anyC.advanceAmount ?? 0));
    setFormAmountPaid(String(anyC.amountPaid ?? 0));
    setFormAmountDue(String(anyC.amountDue ?? 0));
    setFormPayInput('');
    setFormNotes(anyC.notes || '');
    setFormAssignedVehicle(anyC.assignedVehicle || '');
    setFormPaymentStatus(anyC.paymentStatus || 'Unpaid');
    setActiveTab('personal');
  };

  const [confirmSingleDelete, setConfirmSingleDelete] = React.useState<string | null>(null);

  const handleDeleteCustomer = async (customerId: string) => {
    if (confirmSingleDelete !== customerId) {
      setConfirmSingleDelete(customerId);
      setTimeout(() => setConfirmSingleDelete(null), 3000);
      return;
    }
    
    try {
      await deleteDoc(doc(db as any, 'customers', customerId));
      setConfirmSingleDelete(null);
    } catch (e) {
      console.error("Failed to delete client:", e);
      alert("Failed to delete client catalog folder.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    // Apply the exact payment status and status mapping rule defined in the instructions
    let resolvedStatus = formStatus;
    let finalAmountPaid = parseFloat(formAmountPaid) || 0;
    let finalAmountDue = parseFloat(formAmountDue) || 0;

    if (formPaymentStatus === 'Paid') {
      resolvedStatus = 'Active Renter';
      if (finalAmountDue > 0) {
        finalAmountPaid += finalAmountDue;
        finalAmountDue = 0;
      }
    } else if (formPaymentStatus === 'Unpaid') {
      resolvedStatus = 'Pending Payment';
    }

    try {
      // Synchronize vehicle availability status
      const extractPlate = (vehicleStr: string) => {
        const match = vehicleStr.match(/\(([^)]+)\)/);
        return match ? match[1] : null;
      };

      const oldPlate = editingCustomer.assignedVehicle ? extractPlate(editingCustomer.assignedVehicle) : null;
      const newPlate = formAssignedVehicle ? extractPlate(formAssignedVehicle) : null;
      
      let vehicleHistory = editingCustomer.vehicleHistory || [];
      if (oldPlate && oldPlate !== newPlate && editingCustomer.assignedVehicle) {
        const oldVh = vehicles.find(v => v.plateNumber === oldPlate);
        if (oldVh) {
          await updateDoc(doc(db as any, 'vehicles', oldVh.id), { status: 'available' });
        }
        vehicleHistory.push({
          vehicle: editingCustomer.assignedVehicle,
          switchedAt: new Date().toISOString()
        });
      }
      if (newPlate) {
        const newVh = vehicles.find(v => v.plateNumber === newPlate);
        if (newVh) {
          await updateDoc(doc(db as any, 'vehicles', newVh.id), { status: 'rented' });
        }
      }

      await updateDoc(doc(db as any, 'customers', editingCustomer.id), {
        firstName: formFirstName,
        lastName: formLastName,
        email: formEmail,
        phone: formPhone,
        status: resolvedStatus,
        companyId: formCompanyId || null,
        address: {
          street: formAddress,
          city: formCity,
          state: formState,
          zip: formZip,
          country: formCountry
        },
        dob: formDob,
        licenseId: formLicenseId,
        pickupDate: formPickupDate,
        pickupTime: formPickupTime,
        dropoffDate: formDropoffDate,
        dropoffTime: formDropoffTime,
        rentalAmount: parseFloat(formRentalAmount) || 0,
        advanceAmount: parseFloat(formAdvanceAmount) || 0,
        amountPaid: finalAmountPaid,
        amountDue: finalAmountDue,
        assignedVehicle: formAssignedVehicle || '',
        paymentStatus: formPaymentStatus,
        vehicleHistory: vehicleHistory,
        notes: formNotes
      });

      // Automatically sync billing options to the central rental_payments collection
      if (finalAmountPaid > 0) {
        await setDoc(doc(db as any, 'rental_payments', 'cust_paid_' + editingCustomer.id), {
          customerId: editingCustomer.id,
          customerName: `${formFirstName} ${formLastName}`,
          amount: finalAmountPaid,
          status: 'paid',
          description: `Total Rental Settlement for ${formFirstName} ${formLastName} (Synced from Billing Tab)`,
          date: new Date()
        });
      } else {
        try {
          await deleteDoc(doc(db as any, 'rental_payments', 'cust_paid_' + editingCustomer.id));
        } catch (_) {}
      }

      if (finalAmountDue > 0) {
        await setDoc(doc(db as any, 'rental_payments', 'cust_unpaid_' + editingCustomer.id), {
          customerId: editingCustomer.id,
          customerName: `${formFirstName} ${formLastName}`,
          amount: finalAmountDue,
          status: 'pending',
          description: `Outstanding Invoice Balance for ${formFirstName} ${formLastName} (Synced from Billing Tab)`,
          date: new Date()
        });
      } else {
        try {
          await deleteDoc(doc(db as any, 'rental_payments', 'cust_unpaid_' + editingCustomer.id));
        } catch (_) {}
      }

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

  const filtered = customers.filter(c => {
    if (isArchive) {
      if (c.status !== 'Archived') return false;
    } else {
      if (c.status === 'Archived') return false;
    }
    return (c.firstName + ' ' + c.lastName).toLowerCase().includes(search.toLowerCase()) ||
           c.email.toLowerCase().includes(search.toLowerCase());
  });

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    const action = isArchive ? 'Restore' : 'Archive';
    try {
      const promises = Array.from(selectedIds).map(async (elem) => {
          const id = elem as string;
          const docRef = doc(db as any, 'customers', id);
          return updateDoc(docRef, { status: isArchive ? 'Verified' : 'Archived' });
      });
      await Promise.all(promises);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(`Failed to bulk ${action.toLowerCase()}`, e);
      alert(`Failed to ${action.toLowerCase()} customers`);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{isArchive ? 'Customer Archive' : 'Customer Directory'}</h1>
          <p className="text-zinc-500 text-sm mt-1">{isArchive ? 'Archived client records.' : 'Manage active client records, identities, and agreements.'}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {!isArchive && (
            <button 
              onClick={() => setIsAddingNew(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={14} /> New Record
            </button>
          )}
          <button 
            onClick={toggleSelectAll}
            className="flex-1 sm:flex-none px-4 py-2 bg-zinc-900 text-white border border-[#27272a] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <div className="flex-1 sm:flex-none">
            <CSVImporter 
              onImport={handleImport} 
              label={isArchive ? 'Import to Archive' : 'Bulk Sync'} 
              className="w-full"
              instructions={
                <div className="space-y-2">
                  <p>Upload a CSV or Excel file to bulk import customer records.</p>
                  <p>The system requires your file to match these exact column headers:</p>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-400 font-mono">
                    <li><strong>firstName</strong> or <strong>Name</strong></li>
                    <li><strong>lastName</strong></li>
                    <li><strong>email</strong> or <strong>Email</strong></li>
                    <li><strong>phone</strong> or <strong>Contact</strong></li>
                    <li><strong>status</strong> (e.g. Verified, Pending)</li>
                  </ul>
                  <p className="text-xs text-blue-400 mt-2">Required fields: firstName/Name and email.</p>
                </div>
              }
            />
          </div>
        </div>
      </div>

      <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between gap-4">
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
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleBulkArchive}
                className="px-4 py-2 bg-zinc-900 text-white border border-[#27272a] hover:border-zinc-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isArchive ? 'Restore' : 'Archive'} ({selectedIds.size})
              </button>
              <button 
                onClick={async () => {
                  if (!confirmBulkDelete) {
                    setConfirmBulkDelete(true);
                    setTimeout(() => setConfirmBulkDelete(false), 3000);
                    return;
                  }
                  
                  try {
                    const promises = Array.from(selectedIds).map(async (elem) => {
                        const id = elem as string;
                        return deleteDoc(doc(db as any, 'customers', id));
                    });
                    await Promise.all(promises);
                    setSelectedIds(new Set());
                    setConfirmBulkDelete(false);
                  } catch (e) {
                    console.error("Failed to bulk delete", e);
                    alert("Failed to delete customers");
                  }
                }}
                className="px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {confirmBulkDelete ? 'Click to Confirm' : `Delete (${selectedIds.size})`}
              </button>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#111113]">
                <th className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Client</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Payments</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Vault Assets</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    Loading client files...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No customers found in database.
                  </td>
                </tr>
              ) : (
                filtered.map(customer => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => handleOpenEdit(customer)}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(customer.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const next = new Set(selectedIds);
                          if (next.has(customer.id)) next.delete(customer.id);
                          else next.add(customer.id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#27272a] flex items-center justify-center text-zinc-400 uppercase font-black text-xs">
                          {customer.firstName?.[0] || '?'}{customer.lastName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{customer.firstName} {customer.lastName}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">ID: {customer.id.slice(0, 8).toUpperCase()}</p>
                          {customer.assignedVehicle && (
                            <p className="text-[10px] text-blue-400 font-bold tracking-tight uppercase mt-0.5">🚗 {customer.assignedVehicle}</p>
                          )}
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
                          : (customer.status === 'Unverified' || customer.status === 'Pending Payment')
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/10 border border-[#10b981]/25 text-[#10b981]'
                      )}>
                        <CheckCircle2 size={10} /> {customer.status || 'Verified'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5 text-xs font-mono">
                        <span className="text-emerald-500 font-bold uppercase tracking-tight">Paid: ${(customer.amountPaid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-rose-400 font-bold uppercase tracking-tight">Due: ${(customer.amountDue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setPdfPreviewUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'); }}
                           className="px-2 py-1 bg-zinc-900 border border-[#27272a] rounded flex items-center gap-1.5 hover:border-blue-500/50 transition-colors group/btn"
                         >
                           <FileText size={12} className="text-zinc-500 group-hover/btn:text-blue-400" />
                           <span className="text-[9px] font-bold text-zinc-400 uppercase">Agreement.pdf</span>
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); setPdfPreviewUrl('https://upload.wikimedia.org/wikipedia/commons/4/41/Placeholder_view_vector.svg'); }}
                           className="px-2 py-1 bg-zinc-900 border border-[#27272a] rounded flex items-center gap-1.5 hover:border-purple-500/50 transition-colors group/btn"
                         >
                           <UserCircle size={12} className="text-zinc-500 group-hover/btn:text-purple-400" />
                           <span className="text-[9px] font-bold text-zinc-400 uppercase">Gov ID.jpg</span>
                         </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(customer); }}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" 
                          title="Edit Customer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }}
                          className={`p-1.5 rounded transition-colors ${confirmSingleDelete === customer.id ? 'bg-rose-500/20 text-rose-500' : 'text-zinc-500 hover:text-rose-500 hover:bg-rose-500/15'}`} 
                          title="Purge Record"
                        >
                          {confirmSingleDelete === customer.id ? <span className="text-[10px] font-bold uppercase tracking-widest px-1">Confirm</span> : <Trash2 size={13} />}
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

            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-2">
              Edit Client Profile
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-4">
              ID: {editingCustomer.id.toUpperCase()}
            </p>

            {/* Elegant Tab Navigation */}
            <div className="flex border-b border-[#27272a] mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={cn(
                  "flex-1 pb-2 text-[10px] font-black uppercase tracking-widest text-center border-b-2 transition-all",
                  activeTab === 'personal'
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Personal Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rental')}
                className={cn(
                  "flex-1 pb-2 text-[10px] font-black uppercase tracking-widest text-center border-b-2 transition-all",
                  activeTab === 'rental'
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Rental Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className={cn(
                  "flex-1 pb-2 text-[10px] font-black uppercase tracking-widest text-center border-b-2 transition-all",
                  activeTab === 'billing'
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Billing Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={cn(
                  "flex-1 pb-2 text-[10px] font-black uppercase tracking-widest text-center border-b-2 transition-all",
                  activeTab === 'notes'
                    ? "border-white text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                Notes
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {activeTab === 'personal' && (
                <div className="space-y-4 animate-in fade-in duration-200">
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
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Corporate Affiliation (Optional)</label>
                    <select 
                      value={formCompanyId}
                      onChange={e => setFormCompanyId(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none appearance-none"
                    >
                      <option value="">-- No Company --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
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

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Phone Connection</label>
                    <input 
                      type="text"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'rental' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Assign Vehicle</label>
                    <select 
                      value={formAssignedVehicle}
                      onChange={e => {
                        setFormAssignedVehicle(e.target.value);
                      }}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none appearance-none"
                    >
                      <option value="">-- Select Fleet Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={`${v.year} ${v.make} ${v.model} (${v.plateNumber})`}>
                          {v.year} {v.make} {v.model} ({v.plateNumber}) - {v.status.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Select from Philly Rental active dynamic vehicle catalog.</p>
                  </div>

                  {editingCustomer.vehicleHistory && editingCustomer.vehicleHistory.length > 0 && (
                    <div className="space-y-2 mt-4 bg-zinc-900 border border-zinc-800 p-3 rounded-lg">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Previously Assigned Vehicles</label>
                      <div className="space-y-2">
                        {editingCustomer.vehicleHistory.map((vh, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="text-zinc-300 font-medium">{vh.vehicle}</span>
                            <span className="text-zinc-500 font-mono text-[10px]">{new Date(vh.switchedAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <option value="Active Renter">Active Renter</option>
                        <option value="Pending Payment">Pending Payment</option>
                        <option value="Past Renter">Past Renter</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Pick-up Date</label>
                      <input 
                        type="date"
                        value={formPickupDate}
                        onChange={e => setFormPickupDate(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Pick-up Time</label>
                      <input 
                        type="time"
                        value={formPickupTime}
                        onChange={e => setFormPickupTime(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Drop-off Date</label>
                      <input 
                        type="date"
                        value={formDropoffDate}
                        onChange={e => setFormDropoffDate(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Drop-off Time</label>
                      <input 
                        type="time"
                        value={formDropoffTime}
                        onChange={e => setFormDropoffTime(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Documents & Attachments</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setPdfPreviewUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')}
                        className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500/50 hover:bg-[#18181b]/80 transition-colors group cursor-pointer animate-in fade-in duration-300"
                      >
                        <FileText size={20} className="text-zinc-500 group-hover:text-blue-400" />
                        <span className="text-[9px] font-bold text-zinc-400 group-hover:text-blue-400 text-center uppercase">Rental Agreement</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPdfPreviewUrl('https://upload.wikimedia.org/wikipedia/commons/4/41/Placeholder_view_vector.svg')}
                        className="p-3 bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-purple-500/50 hover:bg-[#18181b]/80 transition-colors group cursor-pointer animate-in fade-in duration-300"
                      >
                        <UserCircle size={20} className="text-zinc-500 group-hover:text-purple-400" />
                        <span className="text-[9px] font-bold text-zinc-400 group-hover:text-purple-400 text-center uppercase">Gov ID Scan</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block mb-1">Payment Status</label>
                    <PaymentToggle 
                      value={formPaymentStatus}
                      onChange={async (nextVal) => {
                        setFormPaymentStatus(nextVal);
                        
                        let resolvedStatus = formStatus;
                        let finalAmountPaid = parseFloat(formAmountPaid) || 0;
                        let finalAmountDue = parseFloat(formAmountDue) || 0;

                        if (nextVal === 'Paid') {
                          resolvedStatus = 'Active Renter';
                          setFormStatus('Active Renter');
                          if (finalAmountDue > 0) {
                            finalAmountPaid += finalAmountDue;
                            finalAmountDue = 0;
                            setFormAmountPaid(String(finalAmountPaid));
                            setFormAmountDue('0');
                          }
                        } else if (nextVal === 'Unpaid') {
                          resolvedStatus = 'Pending Payment';
                          setFormStatus('Pending Payment');
                        }

                        // Immediately persist to Firestore to update central trackers in real-time
                        if (editingCustomer && db) {
                          try {
                            const custRef = doc(db as any, 'customers', editingCustomer.id);
                            await updateDoc(custRef, {
                              paymentStatus: nextVal,
                              status: resolvedStatus,
                              amountPaid: finalAmountPaid,
                              amountDue: finalAmountDue
                            });

                            // Sync to rental_payments collection immediately
                            if (finalAmountPaid > 0) {
                              await setDoc(doc(db as any, 'rental_payments', 'cust_paid_' + editingCustomer.id), {
                                customerId: editingCustomer.id,
                                customerName: `${formFirstName} ${formLastName}`,
                                amount: finalAmountPaid,
                                status: 'paid',
                                description: `Total Rental Settlement for ${formFirstName} ${formLastName} (Synced from Billing Tab Toggle)`,
                                date: new Date()
                              });
                            } else {
                              try {
                                await deleteDoc(doc(db as any, 'rental_payments', 'cust_paid_' + editingCustomer.id));
                              } catch (_) {}
                            }

                            if (finalAmountDue > 0) {
                              await setDoc(doc(db as any, 'rental_payments', 'cust_unpaid_' + editingCustomer.id), {
                                customerId: editingCustomer.id,
                                customerName: `${formFirstName} ${formLastName}`,
                                amount: finalAmountDue,
                                status: 'pending',
                                description: `Outstanding Invoice Balance for ${formFirstName} ${formLastName} (Synced from Billing Tab Toggle)`,
                                date: new Date()
                              });
                            } else {
                              try {
                                await deleteDoc(doc(db as any, 'rental_payments', 'cust_unpaid_' + editingCustomer.id));
                              } catch (_) {}
                            }
                          } catch (err) {
                            console.error("Error synchronously toggling database state:", err);
                          }
                        }
                      }}
                    />
                    <p className="text-[9px] text-zinc-500 font-mono mt-1.5">Paid transitions client to "Active Renter". Unpaid transitions to "Pending Payment". Updates take effect instantly.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block font-mono">Rental Amount ($)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={formRentalAmount}
                        onChange={e => {
                          setFormRentalAmount(e.target.value);
                          const rental = parseFloat(e.target.value) || 0;
                          const advance = parseFloat(formAdvanceAmount) || 0;
                          setFormAmountDue(Math.max(0, rental - advance).toFixed(2));
                        }}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block font-mono">Advance Amount ($)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={formAdvanceAmount}
                        onChange={e => {
                          setFormAdvanceAmount(e.target.value);
                          const rental = parseFloat(formRentalAmount) || 0;
                          const advance = parseFloat(e.target.value) || 0;
                          setFormAmountPaid(e.target.value);
                          setFormAmountDue(Math.max(0, rental - advance).toFixed(2));
                        }}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500/50 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block font-mono">Amount Paid ($)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={formAmountPaid}
                        onChange={e => {
                          setFormAmountPaid(e.target.value);
                          const paid = parseFloat(e.target.value) || 0;
                          const rental = parseFloat(formRentalAmount) || 0;
                          setFormAmountDue(Math.max(0, rental - paid).toFixed(2));
                        }}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500/50 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block font-mono">Outstanding Due ($)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={formAmountDue}
                        onChange={e => setFormAmountDue(e.target.value)}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500/50 outline-none font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  {/* Visual state warning if due exists, or balance has been paid */}
                  <div className="bg-zinc-950 p-3 rounded-lg border border-[#27272a] space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Record Instantly</span>
                      {parseFloat(formAmountDue) > 0 ? (
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded uppercase font-black tracking-widest animate-pulse">Outstanding Due</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase font-black tracking-widest">Paid In Full</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        step="0.01"
                        value={formPayInput}
                        onChange={e => setFormPayInput(e.target.value)}
                        placeholder="Enter amount..."
                        className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 font-mono focus:border-emerald-500/50 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const payVal = parseFloat(formPayInput);
                          if (!isNaN(payVal) && payVal > 0) {
                            const currentPaid = parseFloat(formAmountPaid || '0');
                            const currentDue = parseFloat(formAmountDue || '0');
                            setFormAmountPaid((currentPaid + payVal).toFixed(2));
                            setFormAmountDue(Math.max(0, currentDue - payVal).toFixed(2));
                            setFormPayInput('');
                          }
                        }}
                        className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                      >
                        Record Pay
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Personalized Operative Notes</label>
                    <textarea 
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-3 text-xs text-zinc-300 focus:border-blue-500/50 outline-none resize-none min-h-[160px]"
                      placeholder="Add any internal annotations, incidents, or contextual data concerning this client..."
                    />
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-lg border border-[#27272a]">
                    <p className="text-[9px] text-zinc-500 font-mono">Notes are private and visibly restricted to administrators and designated staff members. External data transmission is isolated.</p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-[#27272a] mt-4">
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

      {/* PDF/Image Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#111113] border border-[#27272a] w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#27272a] flex justify-between items-center bg-zinc-900">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">Document Viewer</h2>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => window.open(pdfPreviewUrl, '_blank')}
                   className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest px-3 py-1.5 border border-[#27272a] rounded bg-black/20"
                 >
                   Open in New Tab
                 </button>
                 <button 
                  onClick={() => setPdfPreviewUrl(null)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 border border-[#27272a] text-zinc-400 hover:text-white transition-colors hover:bg-zinc-700"
                  title="Close Viewer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-zinc-950 flex items-center justify-center overflow-auto p-4 w-full h-full relative">
              {pdfPreviewUrl.endsWith('.pdf') ? (
                 <iframe 
                   src={`${pdfPreviewUrl}#zoom=FitH`} 
                   className="w-full h-full border-none rounded-xl bg-white shadow-inner"
                   title="PDF Document Viewer"
                 />
              ) : (
                 <div className="w-full h-full bg-zinc-900/50 rounded-xl flex items-center justify-center overflow-auto border border-[#27272a]">
                   <img 
                     src={pdfPreviewUrl} 
                     alt="Document Preview" 
                     className="max-w-full max-h-full object-contain rounded-lg"
                   />
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
