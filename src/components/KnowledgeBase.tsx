import React from 'react';
import { BookOpen, Key, Users, Car, Wallet, Shield, Zap } from 'lucide-react';

export default function KnowledgeBase() {
  const sections = [
    {
      title: "Core Workflows",
      icon: Zap,
      items: [
        "How to process a refund: Open Reservations -> Select Customer -> Open Payment History -> Click Refund -> Confirm reason.",
        "Marking a vehicle unavailable: Go to Fleet Inventory -> Select Vehicle -> Mark as Maintenance or Out of Service.",
        "Ticket Matching System: The plate number format must match exactly (e.g., ABC1234, not ABC-1234). The system enforces strict hyphenation rules."
      ]
    },
    {
      title: "User & Admin Management",
      icon: Users,
      items: [
        "Adding a User/VA: Click '+ New Record' -> Add New Operator (User).",
        "Role Permissions: Actions are restricted based on user roles (Super Admin, Admin, Staff, Viewer).",
        "Activity Logs: System modifications are recorded and accessible to admins."
      ]
    },
    {
      title: "Reservations & Customers",
      icon: Key,
      items: [
        "New Reservations: Can be created via the quick access menu or the active rentals page.",
        "Deposits: Keep track of deposit holds, refunds, and collections.",
        "Suspicious Activity: Usually involves same-day cancellations, repeated failed payments, or deposits missing before check-out."
      ]
    },
    {
      title: "Fleet Operations",
      icon: Car,
      items: [
        "Handling damages/claims: Click '+ New Record' -> Report Vehicle Damage -> Fill in severity and vehicle ID.",
        "Maintenance Tracking: All routine maintenance should be tracked and alerts will be shown for overdue service."
      ]
    },
    {
      title: "Financial Processes",
      icon: Wallet,
      items: [
        "Payment Logging: Insurance and rental payments go to their respective modules.",
        "Fines & Tolls: Must be assigned securely to active renters who possessed the vehicle at the exact time of violation."
      ]
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b border-[#27272a] pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="text-blue-500" />
          Official Knowledge Base (OKB)
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Platform instructions, operational guidelines, and system logic references.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={idx} className="bg-zinc-900 border border-[#27272a] rounded-2xl p-6 shadow-xl hover:border-zinc-700 transition-colors">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mb-4">
                <Icon size={20} className="text-blue-500" />
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.items.map((item, i) => (
                  <li key={i} className="text-zinc-400 text-sm flex items-start gap-2">
                    <span className="text-zinc-600 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-12 pt-8 border-t border-[#27272a] text-center">
        <p className="text-xs text-zinc-500 font-medium tracking-widest uppercase mb-1">System Version 2.0</p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
          Developed exclusively by <span className="text-white font-bold">license4booking</span>
        </p>
      </div>
    </div>
  );
}
