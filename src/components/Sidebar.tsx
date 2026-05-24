import React from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Calendar, 
  ShieldCheck, 
  Wallet, 
  ChevronRight, 
  Map as MapIcon,
  Navigation,
  Search,
  Plus,
  Settings,
  Bell,
  Menu,
  X,
  CreditCard,
  UserCircle,
  ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  isOpen?: boolean;
}

const SidebarItem = ({ icon: Icon, label, isActive, onClick, children, isOpen }: SidebarItemProps) => {
  const [isSubOpen, setIsSubOpen] = React.useState(false);

  return (
    <div className="mb-1">
      <button
        onClick={() => {
          if (children) setIsSubOpen(!isSubOpen);
          onClick?.();
        }}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group text-slate-400 hover:text-white hover:bg-white/5",
          isActive && "text-white bg-white/10"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("w-5 h-5", isActive ? "text-white" : "group-hover:text-white")} />
          <span className={cn("text-sm font-medium", !isOpen && "hidden")}>{label}</span>
        </div>
        {children && isOpen && (
          <ChevronRight className={cn("w-4 h-4 transition-transform", isSubOpen && "rotate-90")} />
        )}
      </button>
      {children && isSubOpen && isOpen && (
        <div className="ml-9 mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

const SubItem = ({ label, isActive, onClick }: { label: string; isActive?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors",
      isActive ? "text-white font-medium" : "text-slate-500 hover:text-white hover:bg-white/5"
    )}
  >
    {label}
  </button>
);

export default function Sidebar({ activeView, setView, isMobileOpen, setIsMobileOpen }: { activeView: string; setView: (v: string) => void; isMobileOpen: boolean; setIsMobileOpen: (v: boolean) => void }) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <>
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-[#09090b] border-r border-[#27272a] transition-transform duration-300 z-50 flex flex-col w-64 md:w-auto md:translate-x-0 pb-20 md:pb-0 overflow-y-auto md:overflow-visible",
        isOpen ? "md:w-64" : "md:w-16",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className={cn("p-6 flex items-center mb-4 transition-all shrink-0", isOpen ? "gap-3" : "md:justify-center md:p-4 gap-3")}>
          <div className="w-10 h-10 bg-[#18181b] border border-[#27272a] rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
            <img 
              src="https://i.imgur.com/2jo5OjT.png" 
              alt="Philly Rental Sys Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className={cn("text-lg font-black tracking-widest text-white uppercase italic", !isOpen && "md:hidden")}>Philly Rental</span>
          
          <button 
            className="md:hidden ml-auto p-2 text-zinc-400 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-[#09090b] border border-[#27272a] rounded-full flex items-center justify-center text-zinc-500 hover:text-white transition-colors z-10"
        >
        {isOpen ? <X size={12} /> : <Menu size={12} />}
      </button>

      {/* Nav Section */}
      <div className={cn("flex-1 px-3 overflow-y-auto pt-2 space-y-6 scrollbar-hide", !isOpen && "px-1")}>
        <div>
          <p className={cn("px-4 mb-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest", !isOpen && "hidden")}>
            General
          </p>
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            isActive={activeView === 'dashboard'} 
            onClick={() => setView('dashboard')}
            isOpen={isOpen}
          />
          <SidebarItem 
            icon={Users} 
            label="Customers" 
            isActive={activeView === 'customers'} 
            onClick={() => setView('customers')}
            isOpen={isOpen}
          />
          <SidebarItem 
            icon={Wallet} 
            label="Expenses" 
            isActive={activeView === 'finance'} 
            onClick={() => setView('finance')}
            isOpen={isOpen}
          />
        </div>

        <div>
          <p className={cn("px-4 mb-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest", !isOpen && "hidden")}>
            Management
          </p>
          <SidebarItem 
            icon={Calendar} 
            label="Operations" 
            isActive={activeView.startsWith('ops')} 
            isOpen={isOpen}
          >
            <SubItem label="Active Rentals" isActive={activeView === 'ops-reservations'} onClick={() => setView('ops-reservations')} />
            <SubItem label="Calendar" isActive={activeView === 'ops-calendar'} onClick={() => setView('ops-calendar')} />
            <SubItem label="Payments Due" isActive={activeView === 'ops-payment-due'} onClick={() => setView('ops-payment-due')} />
            <SubItem label="Late Returns" isActive={activeView === 'ops-late-returns'} onClick={() => setView('ops-late-returns')} />
          </SidebarItem>

          <SidebarItem 
            icon={Car} 
            label="Fleet" 
            isActive={activeView.startsWith('fleet')} 
            isOpen={isOpen}
          >
            <SubItem label="Inventory" isActive={activeView === 'fleet-inventory'} onClick={() => setView('fleet-inventory')} />
            <SubItem label="Live Map" isActive={activeView === 'fleet-map'} onClick={() => setView('fleet-map')} />
            <SubItem label="Maintenance" isActive={activeView === 'fleet-maintenance'} onClick={() => setView('fleet-maintenance')} />
            <SubItem label="Out of Service" isActive={activeView === 'fleet-out-of-service'} onClick={() => setView('fleet-out-of-service')} />
          </SidebarItem>

          <SidebarItem 
            icon={CreditCard} 
            label="Billing" 
            isActive={activeView.startsWith('payment')} 
            isOpen={isOpen}
          >
            <SubItem label="Rental Payments" isActive={activeView === 'payment-rentals'} onClick={() => setView('payment-rentals')} />
            <SubItem label="Deposits" isActive={activeView === 'payment-deposits'} onClick={() => setView('payment-deposits')} />
            <SubItem label="Refunds" isActive={activeView === 'payment-refunds'} onClick={() => setView('payment-refunds')} />
            <SubItem label="Fines & Tolls" isActive={activeView === 'payment-fines'} onClick={() => setView('payment-fines')} />
          </SidebarItem>

          <SidebarItem 
            icon={ShieldCheck} 
            label="Damages / Claims" 
            isActive={activeView.startsWith('vehicle-status')} 
            isOpen={isOpen}
          >
            <SubItem label="Damage Photos" isActive={activeView === 'vehicle-status-damages'} onClick={() => setView('vehicle-status-damages')} />
            <SubItem label="Repair Status" isActive={activeView === 'vehicle-status-repairs'} onClick={() => setView('vehicle-status-repairs')} />
            <SubItem label="Insurance Claims" isActive={activeView === 'vehicle-status-claims'} onClick={() => setView('vehicle-status-claims')} />
          </SidebarItem>

          <SidebarItem 
            icon={ClipboardList} 
            label="Forms" 
            isActive={activeView.startsWith('forms')} 
            isOpen={isOpen}
          >
            <SubItem label="Rental Agreement" isActive={activeView === 'forms-agreement'} onClick={() => setView('forms-agreement')} />
            <SubItem label="Inspection Form" isActive={activeView === 'forms-inspection'} onClick={() => setView('forms-inspection')} />
            <SubItem label="Incident Report" isActive={activeView === 'forms-incident'} onClick={() => setView('forms-incident')} />
          </SidebarItem>
        </div>
      </div>

      {/* User Footer */}
      <div className={cn("p-4 border-t border-[#27272a] space-y-2", !isOpen && "px-2")}>
        <SidebarItem icon={Settings} label="Settings" isActive={activeView === 'settings'} onClick={() => setView('settings')} isOpen={isOpen} />
        <SidebarItem 
          icon={Users} 
          label="Users" 
          isActive={activeView === 'users'} 
          onClick={() => setView('users')}
          isOpen={isOpen}
        />
        <button className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:text-white transition-colors group",
          !isOpen && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-[#27272a] shrink-0">
            <span className="text-[10px] font-bold">AD</span>
          </div>
          {isOpen && (
            <div className="text-left overflow-hidden">
              <p className="text-xs font-medium text-white truncate">Admin Account</p>
              <p className="text-[10px] text-zinc-600 truncate">admin@phillyrental.com</p>
            </div>
          )}
        </button>
      </div>
    </aside>
    </>
  );
}
