import React from 'react';

interface PaymentToggleProps {
  value: 'Paid' | 'Unpaid';
  onChange: (value: 'Paid' | 'Unpaid') => void;
}

export default function PaymentToggle({ value, onChange }: PaymentToggleProps) {
  return (
    <div className="flex p-1 bg-[#18181b] border border-[#242427] rounded-xl overflow-hidden font-mono text-[10px] uppercase tracking-wider select-none relative transition-all w-full">
      <button
        type="button"
        id="payment-toggle-paid"
        onClick={() => onChange('Paid')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-black transition-all duration-300 relative z-10 cursor-pointer ${
          value === 'Paid'
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold shadow-lg shadow-emerald-500/5'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${value === 'Paid' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`}></span>
        Paid
      </button>
      <button
        type="button"
        id="payment-toggle-unpaid"
        onClick={() => onChange('Unpaid')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-black transition-all duration-300 relative z-10 cursor-pointer ${
          value === 'Unpaid'
            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold shadow-lg shadow-rose-500/5'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${value === 'Unpaid' ? 'bg-rose-400 animate-pulse' : 'bg-zinc-600'}`}></span>
        Unpaid
      </button>
    </div>
  );
}
