import React, { createContext, useContext, useEffect, useState } from 'react';
import { notificationService, AppNotification, NotificationType } from '../services/notificationService';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  simulateNotification: (title: string, message: string, type: NotificationType, link?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const prevNotificationsRef = React.useRef<AppNotification[]>([]);
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Subscribe to real-time notification updates
        const unsubNotifications = notificationService.subscribe((newNotifications) => {
          // Play sound disabled
          prevNotificationsRef.current = newNotifications;
          setNotifications(newNotifications);
        });
        
        // Attempt FCM initialization if a VAPID key is provided in env
        // Use import.meta.env directly for Vite compatibility
        const VAPID_KEY = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
        if (VAPID_KEY) {
          notificationService.initializeFCM(VAPID_KEY);
        }

        // Listen for foreground messages
        const unsubFCM = notificationService.onForegroundMessage((payload) => {
          // You could show a custom toast here
          console.log("FCM foreground notify:", payload);
        });

        return () => {
          unsubNotifications();
          if (unsubFCM) unsubFCM();
        };
      } else {
        setNotifications([]);
      }
    });

    return () => unsubAuth();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
  };

  const deleteNotification = async (id: string) => {
    await notificationService.delete(id);
  };
  
  const clearAllNotifications = async () => {
    // Iterate and delete all, or implement a batch delete in service
    for (const n of notifications) {
      if (n.id) {
        await notificationService.delete(n.id);
      }
    }
  };

  const simulateNotification = async (title: string, message: string, type: NotificationType, link?: string) => {
    await notificationService.send({
      title,
      message,
      type,
      link,
      priority: 'medium' as any
    });
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      deleteNotification,
      clearAllNotifications,
      simulateNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
