import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Building2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompanies(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching companies:", error);
      setLoading(false);
    });

    const handleOpenNew = (e: any) => {
      if (e.detail === 'company') {
        resetForm();
        setEditingId(null);
        setIsAddingNew(true);
      }
    };
    window.addEventListener('open-new-record', handleOpenNew);

    return () => {
      unsubscribe();
      window.removeEventListener('open-new-record', handleOpenNew);
    };
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormContactPerson('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) return;

    const data = {
      name: formName,
      contactPerson: formContactPerson,
      email: formEmail,
      phone: formPhone,
      address: formAddress,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'companies', editingId), data);
      } else {
        await addDoc(collection(db, 'companies'), {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      setIsAddingNew(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      console.error("Failed to save company", err);
      alert("Failed to save company record");
    }
  };

  const handleEdit = (comp: any) => {
    setEditingId(comp.id);
    setFormName(comp.name || '');
    setFormContactPerson(comp.contactPerson || '');
    setFormEmail(comp.email || '');
    setFormPhone(comp.phone || '');
    setFormAddress(comp.address || '');
    setIsAddingNew(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this company record permanently?")) return;
    try {
      await deleteDoc(doc(db, 'companies', id));
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Failed to delete record");
    }
  };

  const filtered = companies.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.contactPerson || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 sm:gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Corporate Accounts</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage B2B companies and their contact information.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setEditingId(null); setIsAddingNew(true); }}
          className="px-4 py-2 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} /> New Company
        </button>
      </div>

      <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#27272a]">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search companies..."
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
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Company</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Contact Person</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500">Contact Details</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-zinc-500 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    Loading companies...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No companies found.
                  </td>
                </tr>
              ) : (
                filtered.map(comp => (
                  <tr key={comp.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-[#27272a] flex items-center justify-center text-zinc-400">
                          <Building2 size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{comp.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">{comp.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-white">{comp.contactPerson || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <p className="text-xs text-white">{comp.email || 'N/A'}</p>
                      <p className="text-[10px] text-zinc-500 font-mono">{comp.phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleEdit(comp)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" 
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(comp.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/15 rounded transition-colors" 
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

      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-[#27272a] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsAddingNew(false)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-4">
              {editingId ? 'Edit Company' : 'New Corporate Account'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Company Name</label>
                <input 
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Contact Person</label>
                <input 
                  type="text"
                  value={formContactPerson}
                  onChange={e => setFormContactPerson(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Email</label>
                  <input 
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Phone</label>
                  <input 
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Address</label>
                <input 
                  type="text"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-wider"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
