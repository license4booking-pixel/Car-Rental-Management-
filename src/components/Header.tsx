import React, { useState } from 'react';
import { Search, Bell, HelpCircle, ChevronRight, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '../context/NotificationContext';

interface HeaderProps {
  activeView: string;
  onMenuClick?: () => void;
}

export default function Header({ activeView, onMenuClick }: HeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();

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
              placeholder="Search Assets..."
              className="bg-[#18181b] border border-[#27272a] rounded-lg py-1.5 pl-9 pr-4 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-500/50 transition-all w-48 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-[#27272a] pl-4">
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 text-zinc-500 hover:text-white transition-colors group"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border-2 border-[#09090b] shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
              )}
            </button>
            <button className="text-xs bg-zinc-800 px-3 py-1.5 rounded border border-zinc-700 hover:bg-zinc-700 transition-colors text-white font-black uppercase tracking-widest">
              Simulation
            </button>
            <button className="text-xs bg-blue-600 px-4 py-1.5 rounded font-black uppercase tracking-widest hover:bg-blue-500 transition-colors text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              + New Record
            </button>
          </div>
        </div>
      </header>

      <NotificationPanel 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </>
  );
}
