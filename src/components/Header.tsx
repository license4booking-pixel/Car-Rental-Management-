import React, { useState } from 'react';
import { Search, Bell, HelpCircle, ChevronRight, ChevronDown, Menu, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../context/NotificationContext';

interface HeaderProps {
  activeView: string;
  onMenuClick?: () => void;
  onNewAction?: (view: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function Header({ activeView, onMenuClick, onNewAction, theme, setTheme }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const getBreadcrumbs = () => {
    const parts = activeView.split('-');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="h-14 border-b border-[#27272a] bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
            onClick={onMenuClick}
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] font-bold uppercase tracking-widest leading-none">
            <span className="hidden sm:inline text-zinc-500">Philly Rental</span>
            <span className="sm:hidden text-zinc-500">PRS</span>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                <span className="text-zinc-700">/</span>
                <span className={cn(
                  "font-bold truncate max-w-[80px] sm:max-w-[150px]",
                  i === breadcrumbs.length - 1 ? "text-zinc-100" : "text-zinc-500"
                )}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search Vehicles..."
              className="bg-[#18181b] border border-[#27272a] rounded-lg py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50 transition-all w-48 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-[#27272a] pl-4 relative">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-zinc-500 hover:text-white transition-colors group"
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 text-zinc-500 hover:text-white transition-colors group"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-[#09090b] shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
              )}
            </button>
            <button className="hidden sm:block text-xs bg-zinc-800 px-3 py-1.5 rounded border border-zinc-700 hover:bg-zinc-700 transition-colors text-white font-black uppercase tracking-widest shrink-0">
              Simulation
            </button>
            <div className="relative shrink-0">
              <button 
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className={cn(
                  "text-[10px] sm:text-xs px-3 sm:px-4 py-2 sm:py-1.5 rounded flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap transition-all duration-200 font-bold tracking-widest uppercase",
                  isNewMenuOpen 
                   ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                   : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                )}
              >
                <span className="hidden sm:inline">New Record</span>
                <span className="sm:hidden">New</span>
                <ChevronDown className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform", isNewMenuOpen && "text-emerald-500 rotate-180")} />
              </button>
              
              {isNewMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNewMenuOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50 py-1 font-sans text-black">
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Quick Actions</span>
                    </div>
                    <button onClick={() => { onNewAction?.('ops-reservations'); setIsNewMenuOpen(false); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-record', { detail: 'reservation' })), 100); }} className="block w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                      New Reservation
                    </button>
                    <button onClick={() => { onNewAction?.('customers'); setIsNewMenuOpen(false); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-record', { detail: 'customer' })), 100); }} className="block w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                      New Customer
                    </button>
                    <button onClick={() => { onNewAction?.('companies'); setIsNewMenuOpen(false); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-record', { detail: 'company' })), 100); }} className="block w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                      New Corporate Account
                    </button>
                    <button onClick={() => { onNewAction?.('fleet-maintenance'); setIsNewMenuOpen(false); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-record', { detail: 'maintenance' })), 100); }} className="block w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                      Schedule Maintenance
                    </button>
                    <div className="px-4 py-2 border-y border-gray-100 bg-gray-50 mt-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">System & Ops</span>
                    </div>
                    <button onClick={() => { onNewAction?.('users'); setIsNewMenuOpen(false); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-record', { detail: 'user' })), 100); }} className="block w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                      Add New Operator (User)
                    </button>
                    <button onClick={() => { onNewAction?.('vehicle-status-damages'); setIsNewMenuOpen(false); setTimeout(() => window.dispatchEvent(new CustomEvent('open-new-record', { detail: 'damage' })), 100); }} className="block w-full text-left px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                      Report Vehicle Damage
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <NotificationPanel 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        onNavigate={onNewAction}
      />
    </>
  );
}
