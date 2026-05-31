import jsPDF from 'jspdf';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage, db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function generateAndStoreAgreementPDF(reservationId: string) {
  if (!storage) throw new Error("Storage not initialized");

  const resDoc = await getDoc(doc(db, 'reservations', reservationId));
  if (!resDoc.exists()) throw new Error("Reservation not found");
  const resData = resDoc.data();

  let customerData = null;
  if (resData.customerId) {
    const custDoc = await getDoc(doc(db, 'customers', resData.customerId));
    if (custDoc.exists()) customerData = custDoc.data();
  }

  let vehicleData = null;
  if (resData.vehicleId) {
    const vehDoc = await getDoc(doc(db, 'vehicles', resData.vehicleId));
    if (vehDoc.exists()) vehicleData = vehDoc.data();
  }

  const pdf = new jsPDF('p', 'pt', 'a4');
  
  // Header
  pdf.setFontSize(24);
  pdf.text('Philly Rental Sys HQ', 40, 60);
  pdf.setFontSize(14);
  pdf.text('Rental Agreement', 40, 85);
  pdf.setFontSize(10);
  pdf.text(`REF: RA-${reservationId.slice(0, 8).toUpperCase()}`, 40, 105);
  pdf.text(`DATE: ${new Date().toLocaleDateString()}`, 40, 120);

  // Customer Info
  pdf.setFontSize(12);
  pdf.text('Customer Information', 40, 160);
  pdf.setFontSize(10);
  pdf.text(`Name: ${customerData?.firstName || 'Unknown'} ${customerData?.lastName || ''}`, 40, 180);
  pdf.text(`Email: ${customerData?.email || 'N/A'}`, 40, 195);
  pdf.text(`License: ${customerData?.licenseNumber || 'N/A'}`, 40, 210);

  // Vehicle Info
  pdf.setFontSize(12);
  pdf.text('Vehicle Information', 300, 160);
  pdf.setFontSize(10);
  pdf.text(`Make/Model: ${vehicleData?.make || ''} ${vehicleData?.model || ''}`, 300, 180);
  pdf.text(`Plate: ${vehicleData?.plateNumber || 'N/A'}`, 300, 195);

  // Rental details
  const startDate = resData.startDate ? new Date(resData.startDate).toLocaleDateString() : 'N/A';
  const endDate = resData.endDate ? new Date(resData.endDate).toLocaleDateString() : 'N/A';
  
  pdf.setFontSize(12);
  pdf.text('Terms and Conditions', 40, 250);
  pdf.setFontSize(10);
  let text = `The Renter agrees to the rental session starting on ${startDate} and ending on ${endDate}.`;
  pdf.text(text, 40, 270);
  pdf.text('The vehicle must be returned to the office location by 12:00 PM on the scheduled return date.', 40, 285);
  pdf.text('A state of charge (SoC) above 80% or full fuel tank is required upon return.', 40, 300);

  // Base64 Data URL
  const pdfDataUri = pdf.output('datauristring');

  // Upload to Firebase Storage
  const fileRef = ref(storage, `agreements/RA-${reservationId}.pdf`);
  await uploadString(fileRef, pdfDataUri, 'data_url');
  const downloadUrl = await getDownloadURL(fileRef);

  // Save the URL to the reservation document
  await updateDoc(doc(db, 'reservations', reservationId), {
    agreementUrl: downloadUrl
  });

  return downloadUrl;
}
