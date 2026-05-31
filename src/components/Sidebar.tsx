import React from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Calendar, 
  ShieldCheck, 
  Wallet, 
  ChevronDown, 
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
  ClipboardList,
  BookOpen
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { cn } from '../lib/utils';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  isOpen?: boolean;
  badgeCount?: number;
}

const SidebarItem = ({ icon: Icon, label, isActive, onClick, children, isOpen, badgeCount }: SidebarItemProps) => {
  const [isSubOpen, setIsSubOpen] = React.useState(false);

  return (
    <div className="mb-2 md:mb-1">
      <button
        onClick={() => {
          if (children) setIsSubOpen(!isSubOpen);
          onClick?.();
        }}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 md:px-3 md:py-2 rounded-2xl md:rounded-xl transition-all duration-200 group",
          !isSubOpen && "text-slate-400 hover:text-white hover:bg-white/5",
          "md:border-none md:bg-transparent", // keep clean on desktop
          !isSubOpen && "border border-[#27272a] bg-zinc-900/50", // blocky button on mobile (closed)
          isActive && !isSubOpen && "text-white bg-white/10 border-white/20",
          isSubOpen && "bg-white text-black border-transparent md:bg-white md:text-black font-bold shadow-md"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon className={cn("w-6 h-6 md:w-5 md:h-5", isSubOpen ? "text-black" : (isActive ? "text-white" : "group-hover:text-white"))} />
            {(badgeCount ?? 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white flex items-center justify-center rounded-full text-[8px] font-black h-4 w-4 shadow-sm border border-[#09090b]">
                {(badgeCount ?? 0) > 99 ? '99+' : badgeCount}
              </span>
            )}
          </div>
          <span className={cn("text-base md:text-sm font-medium", !isOpen && "md:hidden")}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {children && (
            <div className={cn("w-8 h-8 md:w-auto md:h-auto rounded-full flex items-center justify-center", isSubOpen ? "bg-black/10 md:bg-transparent text-black" : "bg-white/5 md:bg-transparent text-slate-400")}>
              <ChevronDown className={cn("w-5 h-5 md:w-4 md:h-4 transition-transform", isSubOpen && "rotate-180", !isOpen && "md:hidden")} />
            </div>
          )}
        </div>
      </button>
      {children && isSubOpen && (
        <div className={cn("ml-6 md:ml-9 mt-2 md:mt-1 space-y-2 md:space-y-1 relative pl-4 md:pl-0 border-l border-[#27272a] md:border-none", !isOpen && "md:hidden")}>
          {children}
        </div>
      )}
    </div>
  );
};

const SubItem = ({ label, isActive, onClick, badgeCount }: { label: string; isActive?: boolean; onClick?: () => void; badgeCount?: number }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex justify-between items-center px-4 py-3.5 md:px-3 md:py-1.5 rounded-2xl md:rounded-md text-sm md:text-xs transition-colors group",
      "md:border-none md:bg-transparent",
      "bg-zinc-900/40 border border-[#27272a]/50",
      isActive ? "text-white font-medium bg-white/10 md:bg-transparent border-white/10 md:border-transparent" : "text-slate-500 hover:text-white hover:bg-white/5"
    )}
  >
    <div className="flex items-center gap-2">
      <span>{label}</span>
      {(badgeCount ?? 0) > 0 && (
         <span className="bg-rose-600 text-white flex items-center justify-center rounded-full text-[8px] font-black h-4 w-4 shadow-sm">
           {(badgeCount ?? 0) > 99 ? '99+' : badgeCount}
         </span>
      )}
    </div>
  </button>
);

export default function Sidebar({ activeView, setView, isMobileOpen, setIsMobileOpen }: { activeView: string; setView: (v: string) => void; isMobileOpen: boolean; setIsMobileOpen: (v: boolean) => void }) {
  const [isOpen, setIsOpen] = React.useState(true);
  const { notifications } = useNotifications();

  // Helper to count unread notifications for a given link in the last 24h
  const getBadgeCount = (linkPath: string) => {
    const now = Date.now();
    const active = notifications.filter(n => {
      if (n.read) return false;
      if (n.link !== linkPath && !n.link?.startsWith(linkPath)) return false;
      
      const ts = n.timestamp?.toDate ? n.timestamp.toDate().getTime() : Date.now();
      // Ensure it's within the last 24 hours
      if (now - ts > 24 * 60 * 60 * 1000) return false;
      
      return true;
    });
    return active.length;
  };

  // When a menu component is clicked, mark its notifications as read
  // We don't have per-notification update here. We'll rely on the main list
  // Wait, the requirements says: "when it is checked will automatically be removed"
  const { markAsRead } = useNotifications();
  const handleNav = (v: string) => {
    setView(v);
    // automatically mark notifications belonging to this view as read
    notifications.forEach(n => {
      if (!n.read && n.link === v) {
        markAsRead(n.id!);
      }
    });
  };

  return (
    <>
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-[#09090b] border-r border-[#27272a] transition-transform duration-300 z-50 flex flex-col md:translate-x-0 pb-20 md:pb-0 overflow-y-auto md:overflow-visible",
        isOpen ? "w-full md:w-64" : "w-full md:w-16",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className={cn("p-6 flex items-center mb-4 transition-all shrink-0 justify-between md:justify-start", isOpen ? "gap-3" : "md:justify-center md:p-4 gap-3")}>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#18181b] border border-[#27272a] rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
               <img 
                 src="https://i.imgur.com/2jo5OjT.png" 
                 alt="Philly Rental Sys Logo" 
                 className="w-full h-full object-cover"
                 referrerPolicy="no-referrer"
               />
             </div>
             <span className={cn("text-lg font-black tracking-widest text-white uppercase italic", !isOpen && "md:hidden")}>Philly Rental</span>
          </div>
          
          <button 
            className="md:hidden flex items-center gap-2 bg-rose-500/10 text-rose-500 px-3 py-1.5 rounded-md hover:bg-rose-500/20 transition-colors"
            onClick={() => setIsMobileOpen(false)}
          >
            <span className="text-[10px] uppercase font-bold tracking-widest">Close Menu</span>
            <X size={16} />
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
            onClick={() => handleNav('dashboard')}
            isOpen={isOpen}
            badgeCount={getBadgeCount('dashboard')}
          />
          <SidebarItem 
            icon={Users} 
            label="Customers" 
            isActive={activeView === 'customers' || activeView === 'customers-archive'} 
            isOpen={isOpen}
            badgeCount={(getBadgeCount('customers') || 0) + (getBadgeCount('customers-archive') || 0)}
          >
            <SubItem label="Active Customers" isActive={activeView === 'customers'} onClick={() => handleNav('customers')} badgeCount={getBadgeCount('customers')} />
            <SubItem label="Archive" isActive={activeView === 'customers-archive'} onClick={() => handleNav('customers-archive')} badgeCount={getBadgeCount('customers-archive')} />
          </SidebarItem>
          <SidebarItem 
            icon={UserCircle} 
            label="Companies" 
            isActive={activeView === 'companies'} 
            onClick={() => handleNav('companies')}
            isOpen={isOpen}
            badgeCount={getBadgeCount('companies')}
          />
          <SidebarItem 
            icon={Wallet} 
            label="Expenses" 
            isActive={activeView === 'finance'} 
            onClick={() => handleNav('finance')}
            isOpen={isOpen}
            badgeCount={getBadgeCount('finance')}
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
            badgeCount={getBadgeCount('ops-')}
          >
            <SubItem label="Active Rentals" isActive={activeView === 'ops-reservations'} onClick={() => handleNav('ops-reservations')} badgeCount={getBadgeCount('ops-reservations')} />
            <SubItem label="Calendar" isActive={activeView === 'ops-calendar'} onClick={() => handleNav('ops-calendar')} badgeCount={getBadgeCount('ops-calendar')} />
            <SubItem label="Payments Due" isActive={activeView === 'ops-payment-due'} onClick={() => handleNav('ops-payment-due')} badgeCount={getBadgeCount('ops-payment-due')} />
            <SubItem label="Late Returns" isActive={activeView === 'ops-late-returns'} onClick={() => handleNav('ops-late-returns')} badgeCount={getBadgeCount('ops-late-returns')} />
          </SidebarItem>

          <SidebarItem 
            icon={Car} 
            label="Fleet" 
            isActive={activeView.startsWith('fleet')} 
            isOpen={isOpen}
            badgeCount={getBadgeCount('fleet-')}
          >
            <SubItem label="Inventory" isActive={activeView === 'fleet-inventory'} onClick={() => handleNav('fleet-inventory')} badgeCount={getBadgeCount('fleet-inventory')} />
            <SubItem label="Live Map" isActive={activeView === 'fleet-map'} onClick={() => handleNav('fleet-map')} badgeCount={getBadgeCount('fleet-map')} />
            <SubItem label="Maintenance" isActive={activeView === 'fleet-maintenance'} onClick={() => handleNav('fleet-maintenance')} badgeCount={getBadgeCount('fleet-maintenance')} />
            <SubItem label="Out of Service" isActive={activeView === 'fleet-out-of-service'} onClick={() => handleNav('fleet-out-of-service')} badgeCount={getBadgeCount('fleet-out-of-service')} />
          </SidebarItem>

          <SidebarItem 
            icon={CreditCard} 
            label="Billing" 
            isActive={activeView.startsWith('payment')} 
            isOpen={isOpen}
            badgeCount={getBadgeCount('payment-')}
          >
            <SubItem label="Rental Payments" isActive={activeView === 'payment-rentals'} onClick={() => handleNav('payment-rentals')} badgeCount={getBadgeCount('payment-rentals')} />
            <SubItem label="Deposits" isActive={activeView === 'payment-deposits'} onClick={() => handleNav('payment-deposits')} badgeCount={getBadgeCount('payment-deposits')} />
            <SubItem label="Refunds" isActive={activeView === 'payment-refunds'} onClick={() => handleNav('payment-refunds')} badgeCount={getBadgeCount('payment-refunds')} />
            <SubItem label="Fines & Tolls" isActive={activeView === 'payment-fines'} onClick={() => handleNav('payment-fines')} badgeCount={getBadgeCount('payment-fines')} />
          </SidebarItem>

          <SidebarItem 
            icon={ShieldCheck} 
            label="Damages / Claims" 
            isActive={activeView.startsWith('vehicle-status')} 
            isOpen={isOpen}
            badgeCount={getBadgeCount('vehicle-status-')}
          >
            <SubItem label="Damage Photos" isActive={activeView === 'vehicle-status-damages'} onClick={() => handleNav('vehicle-status-damages')} badgeCount={getBadgeCount('vehicle-status-damages')} />
            <SubItem label="Repair Status" isActive={activeView === 'vehicle-status-repairs'} onClick={() => handleNav('vehicle-status-repairs')} badgeCount={getBadgeCount('vehicle-status-repairs')} />
            <SubItem label="Insurance Claims" isActive={activeView === 'vehicle-status-claims'} onClick={() => handleNav('vehicle-status-claims')} badgeCount={getBadgeCount('vehicle-status-claims')} />
          </SidebarItem>

          <SidebarItem 
            icon={ClipboardList} 
            label="Forms" 
            isActive={activeView.startsWith('forms')} 
            isOpen={isOpen}
            badgeCount={getBadgeCount('forms-')}
          >
            <SubItem label="Rental Agreement" isActive={activeView === 'forms-agreement'} onClick={() => handleNav('forms-agreement')} badgeCount={getBadgeCount('forms-agreement')} />
            <SubItem label="Inspection Form" isActive={activeView === 'forms-inspection'} onClick={() => handleNav('forms-inspection')} badgeCount={getBadgeCount('forms-inspection')} />
            <SubItem label="Incident Report" isActive={activeView === 'forms-incident'} onClick={() => handleNav('forms-incident')} badgeCount={getBadgeCount('forms-incident')} />
          </SidebarItem>

          <div>
            <p className={cn("px-4 mb-4 mt-6 text-[10px] font-bold text-zinc-600 uppercase tracking-widest", !isOpen && "hidden")}>
              System
            </p>
            <SidebarItem icon={BookOpen} label="Knowledge Base (OKB)" isActive={activeView === 'knowledge-base'} onClick={() => handleNav('knowledge-base')} isOpen={isOpen} badgeCount={getBadgeCount('knowledge-base')} />
            <SidebarItem icon={Settings} label="Settings" isActive={activeView === 'settings'} onClick={() => handleNav('settings')} isOpen={isOpen} badgeCount={getBadgeCount('settings')} />
            <SidebarItem 
              icon={Users} 
              label="Users" 
              isActive={activeView === 'users'} 
              onClick={() => handleNav('users')}
              isOpen={isOpen}
              badgeCount={getBadgeCount('users')}
            />
          </div>
        </div>
      </div>

      {/* User Footer */}
      <div className={cn("p-4 border-t border-[#27272a] shrink-0", !isOpen && "px-2")}>
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
