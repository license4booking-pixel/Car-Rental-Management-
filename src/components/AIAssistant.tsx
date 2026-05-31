import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

interface AIAssistantProps {
  activeView: string;
}

export default function AIAssistant({ activeView }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([{
    role: 'ai',
    content: "Hi! I'm your Philly Rental Sys HQ Assistant. Ask me about currently active rentals, revenue, how to process refunds, or any system procedures."
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const gatherBusinessData = async () => {
    try {
      if (!db) return {};

      // Gathering metrics directly for context
      const metrics: any = {};
      
      const vSnap = await getDocs(collection(db, 'vehicles'));
      metrics.vehicles = vSnap.docs.map(d => ({ id: d.id, ...(d.data()) }));
      
      const rSnap = await getDocs(collection(db, 'reservations'));
      metrics.reservations = rSnap.docs.map(d => ({ id: d.id, ...(d.data()) }));

      const pSnap = await getDocs(collection(db, 'payments'));
      metrics.payments = pSnap.docs.map(d => ({ id: d.id, ...(d.data()) }));

      const cSnap = await getDocs(collection(db, 'customers'));
      metrics.customers = cSnap.size;

      // Summary
      const activeRentals = metrics.reservations.filter((r: any) => r.status === 'active').length;
      const maintenanceV = metrics.vehicles.filter((v: any) => ['Maintenance', 'Out of Service'].includes(v.status)).length;
      
      // Calculate today's revenue roughly
      const today = new Date().toISOString().split('T')[0];
      const todaysRevenue = metrics.payments
        .filter((p: any) => p.date?.startsWith(today) || p.createdAt?.includes(today))
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

      return {
        fleetSize: metrics.vehicles.length,
        activeRentals,
        vehiclesInMaintenance: maintenanceV,
        totalCustomers: metrics.customers,
        todaysRevenue,
        rawReservations: metrics.reservations, // passing all raw data for AI to scan
        rawVehicles: metrics.vehicles
      };
    } catch (e) {
      console.error("Failed to gather business data:", e);
      return { error: "Failed to gather database records" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const businessData = await gatherBusinessData();

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          context: {
            activeView,
            role: 'super_admin',
            businessData
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessages(prev => [...prev, { role: 'ai', content: data.result }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all z-50 group pointer-events-auto"
      >
        <Bot size={24} className="group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className={`fixed transition-all duration-300 z-50 pointer-events-auto ease-out
      ${isExpanded 
        ? 'inset-x-4 inset-y-4 md:inset-x-20 md:inset-y-10 rounded-2xl' 
        : 'bottom-6 right-6 w-[360px] h-[550px] max-h-[calc(100vh-48px)] rounded-2xl'
      } flex flex-col bg-[#111113] border border-[#27272a] shadow-2xl overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-zinc-900/50 cursor-move">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">HQ Assistant</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Context Aware System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-zinc-500 hover:text-white transition-colors">
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2 text-zinc-400">
              <Loader2 size={14} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#27272a] bg-zinc-900/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${activeView}...`}
            className="w-full bg-[#18181b] border border-[#27272a] text-sm text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-blue-500"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-zinc-500 text-center uppercase tracking-widest font-black">
          Powered by Qwen Develope by CVCREATION
        </div>
      </form>
    </div>
  );
}
