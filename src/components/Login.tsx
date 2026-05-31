import React from 'react';
import { Lock, Mail, Car, ArrowRight, Database, Chrome } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { cn } from '../lib/utils';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Failed to establish connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          // Attempt sign up if not found (simulating the request to "ADD this as super admin")
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }
      onLogin();
    } catch (err: any) {
      console.error("Email login failed:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password provider is not enabled in Firebase Console. Please use Google Login.");
      } else {
        setError(err.message || "Credential verification failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 selection:bg-blue-500/30 selection:text-blue-200">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e1e1e_0%,#09090b_100%)] opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-[#18181b] border border-[#27272a] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative overflow-hidden group border-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src="https://i.imgur.com/2jo5OjT.png" alt="Philly Rental Sys Logo" className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-lg font-black tracking-[0.2em] text-white uppercase italic ml-1">Philly Rental Sys HQ</h1>
          <p className="text-zinc-600 mt-2 font-black uppercase tracking-tighter text-[10px]">Small Fleet Orchestration Service</p>
        </div>

        <div className="bg-[#09090b] border border-[#27272a] p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6">
          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 shadow-[0_0_40px_rgba(255,255,255,0.05)] border-b-2 border-zinc-300"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Chrome size={14} />
                  Authorize via Google <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button 
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await signInWithEmailAndPassword(auth, 'operator@example.com', 'demoaccesskey');
                  onLogin();
                } catch (err: any) {
                  setError(err.message || "Failed to launch demo mode.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-blue-600 border border-blue-500 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 shadow-[0_0_40px_rgba(37,99,235,0.15)] animate-pulse"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Car size={14} />
                  Demo Mode (1-Click Access) <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#27272a]"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-zinc-600">
                <span className="bg-[#09090b] px-4 tracking-[0.2em]">OR LOGIN WITH CREDS</span>
              </div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="email" 
                    placeholder="OPERATOR EMAIL" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:border-blue-500/50 focus:bg-zinc-900 transition-all outline-none"
                    required
                  />
                </div>
                <div className="relative group">
                  <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="password" 
                    placeholder="ACCESS KEY" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:border-blue-500/50 focus:bg-zinc-900 transition-all outline-none"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Verify Credentials <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
            
            {error && (
              <p className="text-red-500 text-[10px] uppercase font-black tracking-widest text-center animate-pulse pt-2">
                {error}
              </p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#27272a]"></span>
            </div>
            <div className="relative flex justify-center text-[8px] uppercase font-black text-zinc-600">
              <span className="bg-[#09090b] px-2 tracking-[0.5em]">Security Gate</span>
            </div>
          </div>

          <p className="text-zinc-600 text-[10px] text-center leading-relaxed font-medium">
            Standard operator privileges required.<br />
            Personnel with active credentials may proceed.
          </p>
        </div>

        <div className="text-center mt-10">
          <p className="text-zinc-800 text-[9px] font-black uppercase tracking-[0.3em] leading-loose">
            Encrypted Session Protocol v4.2.0<br />
            Authorized Access Only
          </p>
        </div>
      </motion.div>
    </div>
  );
}
