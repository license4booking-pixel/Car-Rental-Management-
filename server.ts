import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

// Initialize Firebase Admin (uses implicit default credentials)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory storage for vehicle locations
  const vehicleRegistry = new Map();

  // Initialize a mock vehicle
  vehicleRegistry.set("TX-9011", { 
    vehicleId: "TX-9011",
    lat: 39.9526, 
    lng: -75.1652, 
    status: "active", 
    trackingActive: true,
    speed: 0,
    heading: 0,
    lastUpdated: new Date().toISOString()
  });

  // 1. Endpoint for Admin to toggle tracking locks
  app.post('/api/admin/toggle-tracking', (req, res) => {
    const { vehicleId, enabled } = req.body;
    if (vehicleRegistry.has(vehicleId)) {
      const vehicle = vehicleRegistry.get(vehicleId);
      vehicle.trackingActive = enabled;
      vehicleRegistry.set(vehicleId, vehicle);
      return res.json({ success: true, trackingActive: enabled });
    }
    res.status(404).json({ error: "Vehicle not found" });
  });

  // 2. Endpoint for Renter App to check status and upload telemetry
  app.post('/api/renter/ping', (req, res) => {
    const { vehicleId, lat, lng, speed, heading } = req.body;
    const vehicle = vehicleRegistry.get(vehicleId);
    
    if (!vehicle) return res.status(404).json({ error: "Invalid Link" });

    // If tracking is active, update the coordinates in our registry
    if (vehicle.trackingActive && lat && lng) {
      vehicle.lat = lat;
      vehicle.lng = lng;
      if (speed !== undefined) vehicle.speed = speed;
      if (heading !== undefined) vehicle.heading = heading;
      vehicle.lastUpdated = new Date().toISOString();
    }

    // Always return the tracking command state back to the renter's phone
    res.json({ trackingActive: vehicle.trackingActive });
  });

  // API Routes (Legacy mappings)
  app.post("/api/update-location", (req, res) => {
    const { vehicleId, lat, lng, speed, heading, status } = req.body;
    
    if (!vehicleId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const locationData = {
      vehicleId,
      lat,
      lng,
      speed: speed || 0,
      heading: heading || 0,
      status: status || 'active',
      trackingActive: vehicleRegistry.get(vehicleId)?.trackingActive ?? true,
      lastUpdated: new Date().toISOString()
    };

    vehicleRegistry.set(vehicleId, locationData);
    res.json({ status: "success", received: locationData });
  });

  app.get("/api/fleet-locations", (req, res) => {
    const locations = Array.from(vehicleRegistry.values());
    res.json(locations);
  });

  // Gemini API Endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      if (!prompt) return res.status(400).json({ error: "Missing parameter: prompt" });

      const { GoogleGenAI } = await import("@google/genai");
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Server missing GEMINI_API_KEY" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemInstruction = `
You are the Philly Rental Sys HQ Assistant.
You can act as both an "Owner AI Assistant" (for business intelligence) and a "VA Support AI" (for operational help).
You must provide short, concise, and executive answers.

For business intelligence queries:
- Read the provided live business metrics.
- Keep your answers SHORT and executive. e.g., "Today's revenue is $400. 2 vehicles are overdue."

For VA operational help:
- Provide short, step-by-step instructions.
- Be context-aware. If they ask "Why is this ticket not matching?", they might be on the fines page. Look at their active view.

Current Application Context:
Active View/Module: ${context?.activeView || 'Unknown'}
User Role: ${context?.role || 'Unknown'}

Available Business Data in Real Time:
${context?.businessData ? JSON.stringify(context.businessData).substring(0, 8000) : 'No business data provided.'}

Knowledge Base & Workflows:
1. To process a refund: Open Reservations -> Select Customer -> Open Payment History -> Click Refund -> Confirm reason.
2. Adding a User/VA: Click '+ New Record' -> Schedule operator or Add New Operator (User).
3. Handling damage/claims: Click '+ New Record' -> Report Vehicle Damage -> Fill in severity and vehicle ID.
4. Ticket Matching: The plate number format must match exactly (e.g. ABC1234, not ABC-1234). The system enforces strict hyphenation rules.
5. Marking vehicle Unavailable: Go to Fleet Inventory -> Select Vehicle -> Mark as Maintenance or Out of Service.
6. Suspicious activity usually involves same-day cancellations, repeated failed payments, or deposits missing before check-out, visible in Reservations module.

Always act like a professional, advanced AI business operator. No long chatbot intros. Provide direct answers.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      res.json({ result: response.text });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate content" });
    }
  });

  // Endpoints for Data Synchronization
  app.post("/api/admin/import-customers", async (req, res) => {
    try {
      const records = req.body.records;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: "Invalid payload format. Expected records array." });
      }

      const db = admin.firestore();
      
      // Execute the entire import process within a single database transaction/batch
      // We process sequentially in a batch. If batch commits successfully, it's atomic.
      // Firestore batches support up to 500 writes. We chunk if necessary.
      const batch = db.batch();
      
      let writeCount = 0;
      
      for (const record of records) {
        // Validation of incoming payload
        if (!record.Email || !record.Name) {
           throw new Error("Missing required fields: Name or Email");
        }
        
        const customerRef = db.collection('customers').doc();
        let customerId = customerRef.id;

        // Try to find existing customer by email to update instead of insert (anchor)
        const existingCustomerSnap = await db.collection('customers').where('email', '==', record.Email).limit(1).get();
        let currentRef = customerRef;
        if (!existingCustomerSnap.empty) {
          currentRef = existingCustomerSnap.docs[0].ref;
          customerId = currentRef.id;
        }

        const [firstName, ...lastNameParts] = record.Name.split(' ');
        const lastName = lastNameParts.join(' ');

        // Phase 2, Step A: Upsert customer data
        batch.set(currentRef, {
          firstName: firstName || '',
          lastName: lastName || '',
          email: record.Email,
          phone: record.Phone || record.Contact || '',
          licenseNumber: record['Driver License'] || record['License Number'] || '',
          tags: ['Migrated'],
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        writeCount++;

        // Operations & Financials processing
        if (record['Vehicle Rented'] || record['Start Date'] || record['End Date']) {
            const startDateStr = record['Start Date'] || new Date().toISOString();
            const endDateStr = record['End Date'] || new Date().toISOString();
            
            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr);
            
            // Calculate Total_Rental_Days
            const msPerDay = 1000 * 60 * 60 * 24;
            const diffInTime = endDate.getTime() - startDate.getTime();
            let totalRentalDays = Math.ceil(diffInTime / msPerDay);
            if (totalRentalDays <= 0) totalRentalDays = 1; // Minimum 1 day

            // Calculate Base_Rent
            const dailyRate = parseFloat(record['Daily Rate']) || 0;
            const baseRent = totalRentalDays * dailyRate;

            // Calculate Fines
            const fines = parseFloat(record['Fines']) || 0;

            // Calculate Deposit
            const depositPaid = parseFloat(record['Deposit Paid']) || 0;

            // Calculate Total_Due
            const totalDue = (baseRent + fines) - depositPaid;

            // Phase 2, Step B: Create record in Active Rentals
            const rentalRef = db.collection('reservations').doc();
            batch.set(rentalRef, {
              customerId,
              vehicleId: record['Vehicle Rented'] || 'Unassigned',
              startDate: admin.firestore.Timestamp.fromDate(startDate),
              endDate: admin.firestore.Timestamp.fromDate(endDate),
              status: 'confirmed',
              totalAmount: baseRent,
              dailyRate,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            writeCount++;

            // Phase 2, Step D: Insert calculated data into Billing Tables
            
            // Insert Deposit
            if (depositPaid > 0) {
              const depositRef = db.collection('deposits').doc();
              batch.set(depositRef, {
                customerId,
                rentalId: rentalRef.id,
                amount: depositPaid,
                status: 'completed',
                date: admin.firestore.FieldValue.serverTimestamp()
              });
              writeCount++;
            }

            // Insert Fines & Tolls
            if (fines > 0) {
              const fineRef = db.collection('fines').doc();
              batch.set(fineRef, {
                customerId,
                rentalId: rentalRef.id,
                amount: fines,
                status: 'pending',
                description: 'Imported fine',
                date: admin.firestore.FieldValue.serverTimestamp()
              });
              writeCount++;
            }

            // Insert Rental Payment Ledger (Base Rent & Total Due)
            const paymentRef = db.collection('rental_payments').doc();
            const totalAmount = baseRent + fines;
            batch.set(paymentRef, {
              customerId,
              rentalId: rentalRef.id,
              baseRent,
              totalDue,
              amount: totalAmount,
              finesIncluded: fines,
              depositApplied: depositPaid,
              status: totalDue > 0 ? 'pending' : 'paid',
              description: 'Imported rental ledger calculation',
              date: admin.firestore.FieldValue.serverTimestamp()
            });
            writeCount++;
        }
      }

      // Execute all operations transactionally 
      await batch.commit();

      res.status(200).json({ success: true, processed: records.length, writes: writeCount });
    } catch (err: any) {
      console.error("Bulk Import Error:", err);
      res.status(500).json({ error: err.message || "Failed to process import" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
