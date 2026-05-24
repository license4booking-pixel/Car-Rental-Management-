/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LiveMap from './components/LiveMap';
import AddCustomer from './components/AddCustomer';
import CustomerManagement from './components/CustomerManagement';
import FleetInventory from './components/FleetInventory';
import FleetMaintenance from './components/FleetMaintenance';
import RentalAgreement from './components/RentalAgreement';
import CalendarView from './components/CalendarView';
import UserManagement from './components/UserManagement';
import Finance from './components/Finance';
import RenterTracker from './components/RenterTracker';
import ReservationManagement from './components/ReservationManagement';
import SystemSettings from './components/SystemSettings';
import Login from './components/Login';
import { AlertCircle } from 'lucide-react';
import { NotificationProvider } from './context/NotificationContext';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import PaymentDue from './components/PaymentDue';
import PaymentInsurance from './components/PaymentInsurance';
import PaymentRentals from './components/PaymentRentals';
import PaymentFines from './components/PaymentFines';
import VehicleDamages from './components/VehicleDamages';
import InsuranceClaims from './components/InsuranceClaims';
import LateReturns from './components/LateReturns';
import OutOfService from './components/OutOfService';
import PaymentDeposits from './components/PaymentDeposits';
import PaymentRefunds from './components/PaymentRefunds';
import RepairStatus from './components/RepairStatus';
import InspectionForm from './components/InspectionForm';
import IncidentReport from './components/IncidentReport';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [activeView, setActiveView] = React.useState('dashboard');

  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // In the demo/preview version, we automatically grant full admin permissions (super_admin)
        // to every logged-in user so they can test everything seamlessly.
        setIsAdmin(true);
        try {
          const adminRef = doc(db, 'admins', user.uid);
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            await setDoc(adminRef, {
              email: user.email || 'operator@example.com',
              name: user.displayName || (user.email ? user.email.split('@')[0] : 'Demo Operator'),
              role: 'super_admin',
              status: 'active',
              createdAt: new Date().toISOString(),
              lastActive: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error("Error creating demo admin record:", e);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'finance':
        return <Finance />;
      case 'users':
        return <UserManagement />;
      case 'ops-calendar':
        return <CalendarView />;
      case 'ops-payment-due':
        return <PaymentDue />;
      case 'renter-tracker':
        return <RenterTracker />;
      case 'fleet-map':
        return <LiveMap />;
      case 'fleet-maintenance':
        return <FleetMaintenance />;
      case 'customers':
        return <CustomerManagement />;
      case 'fleet-inventory':
        return <FleetInventory setView={setActiveView} />;
      case 'vehicle-history':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500">
              <span className="text-2xl font-bold italic">History</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Vehicle History</h2>
              <p className="text-slate-500 text-sm">This view is currently a placeholder for past rentals and incidents.</p>
              <button 
                onClick={() => setActiveView('fleet-inventory')} 
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Back to Fleet Inventory
              </button>
            </div>
          </div>
        );
      case 'ops-reservations':
        return <ReservationManagement setView={setActiveView} />;
      case 'ops-late-returns':
        return <LateReturns />;
      case 'fleet-out-of-service':
        return <OutOfService />;
      case 'payment-deposits':
        return <PaymentDeposits />;
      case 'payment-refunds':
        return <PaymentRefunds />;
      case 'vehicle-status-repairs':
        return <RepairStatus />;
      case 'forms-agreement':
        return <RentalAgreement onBack={() => setActiveView('ops-reservations')} />;
      case 'forms-inspection':
        return <InspectionForm />;
      case 'forms-incident':
        return <IncidentReport />;
      case 'payment-insurance':
        return <PaymentInsurance />;
      case 'payment-rentals':
        return <PaymentRentals />;
      case 'payment-fines':
        return <PaymentFines />;
      case 'vehicle-status-damages':
        return <VehicleDamages />;
      case 'vehicle-status-claims':
        return <InsuranceClaims />;
      case 'settings':
        return <SystemSettings user={user} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500">
              <span className="text-2xl font-bold italic">?</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">View Under Construction</h2>
              <p className="text-slate-500 text-sm">We are currently building this section of Philly Rental Sys HQ.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-sans selection:bg-blue-600 selection:text-white flex overflow-hidden">
        <Sidebar activeView={activeView} setView={(v) => { setActiveView(v); setIsMobileOpen(false); }} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        
        <main className="flex-1 min-h-screen transition-all duration-300 flex flex-col h-screen md:ml-16 lg:ml-64 w-full relative">
          <Header activeView={activeView} onMenuClick={() => setIsMobileOpen(true)} />
          
          <div className="flex-1 overflow-auto bg-[#09090b]">
            <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24">
              {renderView()}
            </div>
          </div>
        </main>

        <div className="fixed inset-0 pointer-events-none opacity-[0.03] contrast-150 brightness-150 z-[100] grain" />
      </div>
    </NotificationProvider>
  );
}

