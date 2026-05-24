import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { NotificationType } from '../services/notificationService';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { notifications, markAsRead, deleteNotification, clearAllNotifications, unreadCount } = useNotifications();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case NotificationType.CRITICAL:
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-0 right-0 h-screen w-full max-w-sm bg-[#09090b] border-l border-[#27272a] shadow-2xl z-[60] flex flex-col"
          >
            <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Notifications</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
                  {unreadCount} Unread Message{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-700 mb-4 border border-[#27272a]">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No Alerts Found</p>
                  <p className="text-[10px] text-zinc-700 mt-2 uppercase">System clean. No critical events detected.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all relative group",
                      n.read 
                        ? "bg-[#09090b] border-[#27272a] opacity-60" 
                        : "bg-[#111113] border-[#27272a] hover:border-zinc-700"
                    )}
                  >
                    {!n.read && (
                      <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    )}
                    
                    <div className="flex gap-4">
                      <div className="mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "text-[10px] font-black uppercase tracking-widest mb-1",
                          n.read ? "text-zinc-500" : "text-white"
                        )}>
                          {n.title}
                        </h3>
                        <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tabular-nums">
                            {n.timestamp?.toDate ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true }) : 'just now'}
                          </span>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!n.read && (
                              <button 
                                onClick={() => markAsRead(n.id!)}
                                className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                              >
                                Mark Read
                              </button>
                            )}
                            <button 
                              onClick={() => deleteNotification(n.id!)}
                              className="p-1.5 text-zinc-700 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[#27272a] bg-[#111113]/50">
              <button 
                onClick={clearAllNotifications}
                className="w-full py-3 bg-zinc-900 border border-[#27272a] text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                Clear Managed Records
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
