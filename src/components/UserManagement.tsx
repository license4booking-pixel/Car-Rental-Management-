import React from 'react';
import { 
  UserPlus, 
  Search, 
  MoreVertical,
  Mail,
  Shield,
  Trash2,
  Key,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, setDoc, doc, deleteDoc } from 'firebase/firestore';
import CSVImporter from './CSVImporter';

interface User {
  id: string;
  name?: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff' | 'viewer';
  status: 'active' | 'invited';
  lastActive?: string;
  createdAt?: any;
}

export default function UserManagement() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formRole, setFormRole] = React.useState<'super_admin' | 'admin' | 'staff' | 'viewer'>('staff');
  const [formStatus, setFormStatus] = React.useState<'active' | 'invited'>('invited');

  React.useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs
        .filter(doc => doc.id !== 'bootstrap_check')
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
      setUsers(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error watching admins collection:", error);
      setLoading(false);
    });

    const handleOpenNew = (e: any) => {
      if (e.detail === 'user') {
        handleOpenAdd();
      }
    };
    window.addEventListener('open-new-record', handleOpenNew);

    return () => {
      unsubscribe();
      window.removeEventListener('open-new-record', handleOpenNew);
    };
  }, []);

  const handleImport = async (data: any[]) => {
    if (!db) return;
    let importedCount = 0;
    for (const row of data) {
      const emailValue = row.email || row.Email;
      if (emailValue) {
        try {
          const email = emailValue.toLowerCase().trim();
          await setDoc(doc(db, 'admins', email), {
            name: row.name || row.Name || email.split('@')[0],
            email: email,
            role: row.role || row.Role || 'viewer',
            status: row.status || row.Status || 'invited',
            createdAt: new Date().toISOString()
          });
          importedCount++;
        } catch (e) {
          console.error("Error importing user", e);
        }
      }
    }
    alert(`Successfully imported ${importedCount} users from CSV.`);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('staff');
    setFormStatus('invited');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name || '');
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormStatus(user.status);
    setIsModalOpen(true);
  };

  const [confirmSingleDelete, setConfirmSingleDelete] = React.useState<string | null>(null);

  const handleDeleteUser = async (userId: string) => {
    if (confirmSingleDelete !== userId) {
      setConfirmSingleDelete(userId);
      setTimeout(() => setConfirmSingleDelete(null), 3000);
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'admins', userId));
      setConfirmSingleDelete(null);
    } catch (e) {
      console.error("Failed to delete operative:", e);
      alert("Error deleting user");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail) {
      alert("Email is required");
      return;
    }
    const targetEmail = formEmail.toLowerCase().trim();

    try {
      // In our setup, admins are keyed by email in lowercase/trimmed or auth uid
      // If editing, keep the same document ID; if adding brand new, we use the email as doc ID
      const docId = editingUser ? editingUser.id : targetEmail;

      await setDoc(doc(db, 'admins', docId), {
        name: formName || targetEmail.split('@')[0],
        email: targetEmail,
        role: formRole,
        status: formStatus,
        createdAt: editingUser?.createdAt || new Date().toISOString(),
        lastActive: editingUser?.lastActive || 'Never'
      }, { merge: true });

      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving operative clearance:", err);
      alert("Save failed");
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors = {
    super_admin: 'text-white bg-rose-600 border border-rose-500',
    admin: 'text-white bg-blue-600 border border-blue-500',
    staff: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20',
    viewer: 'text-zinc-500 bg-zinc-500/10 border border-zinc-500/20',
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">User Access Control</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage personnel clearance and system permissions.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black border border-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-2xl"
          >
            <UserPlus size={14} /> Add New User
          </button>
          <CSVImporter onImport={handleImport} label="Import" />
        </div>
      </div>

      <div className="bg-[#111113] border border-[#27272a] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search operators..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-blue-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#27272a] bg-zinc-900/50">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Operator</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Last Auth</th>
                <th className="px-6 py-4 text-right pr-8 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
                    Loading clearance files...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-xs">
                    No active personnel found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-900 border border-[#27272a] flex items-center justify-center font-bold text-xs text-white group-hover:border-blue-500/50 transition-colors uppercase">
                          {(user.name || user.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white tracking-tight">{user.name || 'System Operator'}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest", roleColors[user.role] || roleColors.viewer)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                         <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", user.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500')} />
                         <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs text-zinc-500 font-mono">
                      {user.lastActive || 'Never'}
                    </td>
                    <td className="px-6 py-5 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" 
                          title="Edit Operator"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className={`p-1.5 rounded transition-colors ${confirmSingleDelete === user.id ? 'bg-rose-500/20 text-rose-500' : 'text-zinc-500 hover:text-rose-500 hover:bg-rose-500/15'}`} 
                          title="Revoke Access"
                        >
                          {confirmSingleDelete === user.id ? <span className="text-[10px] font-bold uppercase tracking-widest px-1">Confirm</span> : <Trash2 size={13} />}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-zinc-900/30 border border-[#27272a] rounded-2xl space-y-4">
          <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white uppercase tracking-tight text-sm">Security Protocols</h3>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">RBAC (Role Based Access Control) is strictly enforced across all fleet operations.</p>
          </div>
        </div>
        
        <div className="p-6 bg-zinc-900/30 border border-[#27272a] rounded-2xl space-y-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
            <Key size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white uppercase tracking-tight text-sm">Auth Logs</h3>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Every terminal session is cryptographically signed and logged for compliance.</p>
          </div>
        </div>

        <div className="p-6 bg-zinc-900/30 border border-[#27272a] rounded-2xl space-y-4">
          <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white uppercase tracking-tight text-sm">Threat Detection</h3>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">Automated suspension of credentials triggered by anomalous geolocation shifts.</p>
          </div>
        </div>
      </div>

      {/* Operative Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111113] border border-[#27272a] p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-white uppercase italic tracking-tight mb-4">
              {editingUser ? 'Edit Operator Clearance' : 'Issue New Operator Entry'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Operator Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Vincent Cerez"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Email Address (Key ID)</label>
                <input 
                  type="email"
                  placeholder="e.g. vincent@phillyrentals.com"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  disabled={editingUser !== null}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none disabled:opacity-50 disabled:bg-zinc-900/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Clearance Level</label>
                  <select 
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as any)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">Auth Status</label>
                  <select 
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500/50 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-900 border border-[#27272a] text-zinc-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors uppercase tracking-wider"
                >
                  Confirm Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
