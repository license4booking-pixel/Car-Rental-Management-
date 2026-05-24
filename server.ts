import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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
