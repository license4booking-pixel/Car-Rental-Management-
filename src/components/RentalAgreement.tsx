import React, { useEffect, useState, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Send, 
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function RentalAgreement({ onBack, reservationId }: { onBack: () => void, reservationId?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reservationId || !db) {
      setLoading(false);
      return;
    }
    
    async function fetchData() {
      try {
        const resDoc = await getDoc(doc(db, 'reservations', reservationId as string));
        if (!resDoc.exists()) throw new Error("Reservation not found");
        const resData = { id: resDoc.id, ...resDoc.data() } as any;
        
        let customerData = null;
        if (resData.customerId) {
          const custDoc = await getDoc(doc(db, 'customers', resData.customerId));
          if (custDoc.exists()) customerData = { id: custDoc.id, ...custDoc.data() };
        }
        
        let vehicleData = null;
        if (resData.vehicleId) {
          const vehDoc = await getDoc(doc(db, 'vehicles', resData.vehicleId));
          if (vehDoc.exists()) vehicleData = { id: vehDoc.id, ...vehDoc.data() };
        }
        
        setData({
          reservation: resData,
          customer: customerData,
          vehicle: vehicleData
        });
      } catch (err) {
        console.error("Error fetching agreement data:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [reservationId]);

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    try {
      const element = pdfRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`RentalAgreement_${reservationId || 'Draft'}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p>Generating Digital Contract...</p>
      </div>
    );
  }

  const { reservation, customer, vehicle } = data || {};

  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : "John Fitzgerald Doe";
  const customerEmail = customer?.email || "john@example.com";
  const dL = customer?.license?.id || customer?.licenseId || "CA-99283-X10";
  
  const vehicleName = vehicle ? `${vehicle.year || 2024} ${vehicle.make} ${vehicle.model}` : "2023 Tesla Model 3";
  const plate = vehicle?.plateNumber || "BCD 4567";
  const dailyRate = vehicle?.dailyRate || 120;
  
  const startDate = reservation?.startDate ? new Date(reservation.startDate).toLocaleDateString() : 'MAY 15, 2026';
  const endDate = reservation?.endDate ? new Date(reservation.endDate).toLocaleDateString() : 'MAY 18, 2026';
  
  // Calculate days for the total
  let days = 3;
  if (reservation?.startDate && reservation?.endDate) {
     const start = new Date(reservation.startDate);
     const end = new Date(reservation.endDate);
     const diffTime = Math.abs(end.getTime() - start.getTime());
     days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const baseTotal = dailyRate * days;
  const insurance = 75;
  const airportFee = 25;
  const grandTotal = baseTotal + insurance + airportFee;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Reservations</span>
        </button>
        <div className="flex gap-3">
          <button className="p-2.5 bg-white/5 border border-white/5 text-slate-400 rounded-xl hover:text-white transition-colors" title="Print format">
            <Printer size={18} />
          </button>
          <button onClick={generatePDF} className="p-2.5 bg-white/5 border border-white/5 text-slate-400 rounded-xl hover:text-white transition-colors" title="Download PDF">
            <Download size={18} />
          </button>
          <button className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <Send size={16} /> Send to Customer
          </button>
        </div>
      </div>

      <div ref={pdfRef} className="bg-white text-black p-12 md:p-16 rounded-3xl shadow-2xl space-y-12 min-h-[1000px] font-serif leading-relaxed">
        <div className="flex justify-between items-start border-b-2 border-black pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-4 italic">Philly Rental Sys HQ</h1>
            <p className="text-xs font-sans font-bold text-slate-500 uppercase tracking-widest leading-loose">
              123 Fleet Way, Innovation District<br />
              San Francisco, CA 94103<br />
              +1 (888) PHL-RENT
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase mb-2">Rental Agreement</h2>
            <p className="text-sm font-sans font-medium text-slate-500">REF: {reservationId ? `RA-${reservationId.slice(0, 8).toUpperCase()}` : 'RA-DRAFT'}</p>
            <p className="text-sm font-sans font-medium text-slate-500">DATE: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 font-sans">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 underline">Customer Information</h3>
            <p className="font-bold text-lg">{customerName}</p>
            <p className="text-sm text-slate-600 mt-1">DL: {dL}</p>
            <p className="text-sm text-slate-600">{customerEmail}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 underline">Vehicle Information</h3>
            <p className="font-bold text-lg">{vehicleName}</p>
            <p className="text-sm text-slate-600 mt-1">Plates: {plate}</p>
            <p className="text-sm text-slate-600">VIN: {vehicle?.vin || 'N/A'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-100 pb-2">1. Terms and Conditions</h3>
          <p className="text-sm text-slate-700">
            The Renter agrees to the rental session starting on <strong>{startDate}</strong> and ending on <strong>{endDate}</strong>. 
            The vehicle must be returned to the office location by 12:00 PM on the scheduled return date.
          </p>
          <p className="text-sm text-slate-700">
            A state of charge (SoC) above 80% or full fuel tank is required upon return. A charging/fuel fee of $50 will be applied if the level is below this threshold.
            Smoking and pets are strictly prohibited inside the vehicle. A cleaning fee of $250 will be assessed for any violations.
          </p>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest border-b border-slate-100 pb-2">2. Financial Disclosure</h3>
          <table className="w-full text-sm font-sans">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 text-slate-600">Daily Rate (${dailyRate.toFixed(2)} x {days} days)</td>
                <td className="py-3 text-right font-bold">${baseTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-600">Insurance (Premium Coverage)</td>
                <td className="py-3 text-right font-bold">${insurance.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-600">Airport Selection Fee</td>
                <td className="py-3 text-right font-bold">${airportFee.toFixed(2)}</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="py-4 font-black">TOTAL AMOUNT DUE</td>
                <td className="py-4 text-right font-black text-xl italic">${grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pt-12 grid grid-cols-2 gap-12 font-sans">
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Renter Signature</p>
            <div className="h-16 flex items-end">
              <span className="text-2xl font-serif italic text-blue-600 select-none opacity-50">{customerName}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Officer Signature</p>
            <div className="h-16 flex items-end">
              <span className="text-2xl font-serif italic text-slate-400 select-none opacity-50">Philly Rental Digital Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
