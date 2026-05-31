import { useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNotifications } from '../context/NotificationContext';

export default function BackgroundTasks() {
  const { simulateNotification } = useNotifications();

  useEffect(() => {
    let active = true;

    const checkPendingPayments = async () => {
      if (!db || !active) return;
      try {
        const q = query(collection(db, 'rental_payments'), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        
        const now = Date.now();
        const pendingOlderThan48h: any[] = [];
        
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const pDate = data.date || data.createdAt;
          if (pDate) {
             const ts = pDate.toDate ? pDate.toDate().getTime() : new Date(pDate).getTime();
             if (now - ts > 48 * 60 * 60 * 1000) {
                 pendingOlderThan48h.push({ id: docSnap.id, ...data });
             }
          }
        });

        if (pendingOlderThan48h.length > 0) {
           simulateNotification(
             "Overdue Payments Warning", 
             `Found ${pendingOlderThan48h.length} payment(s) pending for over 48 hours. Please review.`, 
             "warning" as any, 
             "payment-rentals"
           );
        }
      } catch(e) {
        console.warn("Background check error (payments):", e);
      }
    };

    const checkLateReturns = async () => {
       if (!db || !active) return;
       try {
           const q = query(
               collection(db, 'reservations'), 
               where('status', 'in', ['active', 'confirmed'])
           );
           const snap = await getDocs(q);
           const now = Date.now();
           const lateReturns: any[] = [];
           
           snap.docs.forEach(docSnap => {
               const data = docSnap.data();
               if (data.endDate) {
                   const ts = data.endDate.toDate ? data.endDate.toDate().getTime() : new Date(data.endDate).getTime();
                   if (now > ts && !data.isReturned) {
                       lateReturns.push({ id: docSnap.id, ...data });
                   }
               }
           });

           if (lateReturns.length > 0) {
               simulateNotification(
                   "Late Returns Detected", 
                   `${lateReturns.length} vehicle(s) are overdue for return.`, 
                   "critical" as any, 
                   "ops-late-returns"
               );
           }
       } catch (e) {
           console.warn("Background check error (late returns):", e);
       }
    };

    // Run initially
    checkPendingPayments();
    checkLateReturns();

    // Set interval (every 1 hour in reality, let's do 10 minutes here = 600,000ms)
    // Actually typically we just run it once per session to avoid spamming the UI or we check once every few hours
    const interval = setInterval(() => {
        if (!active) return;
        checkPendingPayments();
        checkLateReturns();
    }, 600000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [simulateNotification]);

  return null;
}
