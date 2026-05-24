import React, { useState, useEffect } from 'react';
import { updateProfile, updateEmail, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User as UserIcon, Mail, Save, FileKey, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SystemSettings({ user }: { user: User }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Loading...');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Populate form with current Firebase Auth values
    setName(user.displayName || '');
    setEmail(user.email || '');

    // Fetch role from Firestore
    const fetchRole = async () => {
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setRole(adminDoc.data().role?.toUpperCase() || 'UNKNOWN');
        } else {
          setRole('USER');
        }
      } catch (err) {
        setRole('ERROR');
      }
    };
    fetchRole();
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (name !== user.displayName) {
        await updateProfile(user, { displayName: name });
        // Update in firestore if needed, though name isn't stored in admins usually
      }

      if (email !== user.email) {
        await updateEmail(user, email);
        // Also update the admins collection email
        await updateDoc(doc(db, 'admins', user.uid), { email: email });
      }

      setMessage({ text: 'Profile protocols updated successfully.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setMessage({ text: 'Security override: You must re-authenticate to change your email.', type: 'error' });
      } else {
        setMessage({ text: err.message || 'Failed to update settings.', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Configure your personal operator console parameters.</p>
      </div>

      <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[#27272a] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-[#27272a] flex items-center justify-center text-zinc-500">
            <UserIcon size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Operator Identity</h3>
            <p className="text-zinc-500 text-[10px] mt-0.5 uppercase tracking-tighter">Current Designation: {role}</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">Display Name</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Operator Name"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter px-1">Communication Channel (Email)</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operator@system.com"
                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-medium"
              />
            </div>
          </div>

          {message && (
            <div className={cn(
              "p-4 rounded-lg flex items-start gap-3",
              message.type === 'success' ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-500"
            )}>
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{message.text}</p>
            </div>
          )}

          <div className="pt-4 border-t border-[#27272a] flex justify-end">
            <button 
              onClick={handleUpdate}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-[0_0_30px_rgba(37,99,235,0.2)] disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Committing..." : <><Save size={14} /> Commit Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
