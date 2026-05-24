import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { db, auth, messaging, handleFirestoreError, OperationType } from '../firebase';

export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  SUCCESS = 'success'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: any;
  read: boolean;
  link?: string;
  priority: NotificationPriority;
}

const NOTIFICATIONS_COLLECTION = 'notifications';
const TOKENS_COLLECTION = 'fcmTokens';

export const notificationService = {
  /**
   * Send a new notification to the system
   */
  async send(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    try {
      await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        ...notification,
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, NOTIFICATIONS_COLLECTION);
    }
  },

  /**
   * Listen for real-time notifications
   */
  subscribe(callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, NOTIFICATIONS_COLLECTION);
    });
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string) {
    try {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${NOTIFICATIONS_COLLECTION}/${id}`);
    }
  },

  /**
   * Delete a notification
   */
  async delete(id: string) {
    try {
      await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${NOTIFICATIONS_COLLECTION}/${id}`);
    }
  },

  /**
   * FCM: Initialize push notifications
   */
  async initializeFCM(vapidKey: string) {
    if (!messaging) return;

    try {
      // Use window.Notification instead of Notification to avoid interface shadow
      if (!('Notification' in window)) return;
      
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey });
        if (token) {
          console.log('FCM Token acquired:', token);
          // Store token in Firestore for backend to use
          if (auth.currentUser) {
            await addDoc(collection(db, TOKENS_COLLECTION), {
              token,
              userId: auth.currentUser.uid,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
    } catch (error) {
      console.error('FCM Initialization error:', error);
    }
  },

  /**
   * FCM: Listen for foreground messages
   */
  onForegroundMessage(callback: (payload: any) => void) {
    if (!messaging) return;
    return onMessage(messaging, (payload) => {
      console.log('Received foreground message:', payload);
      callback(payload);
    });
  }
};
