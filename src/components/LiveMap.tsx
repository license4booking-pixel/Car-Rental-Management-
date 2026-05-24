import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion } from 'motion/react';
import { 
  X, 
  Car, 
  Zap, 
  MapPin, 
  Navigation,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Target,
  Filter,
  Activity
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { db } from '../firebase';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { VehicleStatus } from '../types';
import VehicleMarker from './VehicleMarker';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface VehicleLocation {
  id: string;
  lat: number;
  lng: number;
  plate: string;
  model: string;
  status: VehicleStatus;
  speed: number;
  fuel: number;
  vin: string;
}

const INITIAL_VEHICLES: VehicleLocation[] = [
  { id: '1', lat: 39.9546, lng: -75.1672, plate: 'BCD 4567', model: 'Tesla Model 3', status: VehicleStatus.RENTED, speed: 78, fuel: 45, vin: '1FA6P8CF8...' },
  { id: '2', lat: 39.9626, lng: -75.1552, plate: 'EFG 8901', model: 'Rivian R1S', status: VehicleStatus.AVAILABLE, speed: 0, fuel: 92, vin: '1HGCP22...' },
  { id: '3', lat: 39.9426, lng: -75.1752, plate: 'XYZ 1234', model: 'Porsche Taycan', status: VehicleStatus.AVAILABLE, speed: 0, fuel: 88, vin: 'WP0AA2Y...' },
  { id: '4', lat: 39.9726, lng: -75.1852, plate: 'LMN 5678', model: 'Lucid Air', status: VehicleStatus.RENTED, speed: 105, fuel: 62, vin: '1L3AD4...' },
];

export default function LiveMap() {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<{ [key: string]: { marker: maplibregl.Marker, root: Root } }>({});
  const [selectedVehicle, setSelectedVehicle] = React.useState<VehicleLocation | null>(null);
  
  // Initial mock data
  const [vehicles, setVehicles] = React.useState<VehicleLocation[]>(INITIAL_VEHICLES);

  React.useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [-75.1652, 39.9526], // Philadelphia
      zoom: 12,
      attributionControl: false
    });

    map.current.on('load', () => {
      map.current?.resize();
      
      const targetStr = sessionStorage.getItem('targetMapLocation');
      if (targetStr) {
        try {
          const target = JSON.parse(targetStr);
          if (target && target.lat && target.lng) {
            map.current?.flyTo({
                center: [target.lng, target.lat],
                zoom: 16,
                duration: 2000
            });
          }
          sessionStorage.removeItem('targetMapLocation');
        } catch (e) {
          console.error(e);
        }
      }
    });

    return () => {
      Object.values(markersRef.current).forEach(({ root }) => {
        setTimeout(() => {
          try { root.unmount(); } catch (e) {}
        }, 0);
      });
      markersRef.current = {};
      map.current?.remove();
    };
  }, []);

  // Update markers
  React.useEffect(() => {
    if (!map.current) return;

    vehicles.forEach((vehicle) => {
      let markerData = markersRef.current[vehicle.id];

      if (!markerData) {
        const el = document.createElement('div');
        el.className = 'marker-container';
        
        const root = createRoot(el);
        root.render(
          <VehicleMarker 
            status={vehicle.status} 
            speed={vehicle.speed} 
            plate={vehicle.plate}
            isSelected={selectedVehicle?.id === vehicle.id} 
          />
        );

        el.onclick = () => setSelectedVehicle(vehicle);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map.current!);
        
        markersRef.current[vehicle.id] = { marker, root };
      } else {
        markerData.marker.setLngLat([vehicle.lng, vehicle.lat]);
        markerData.root.render(
          <VehicleMarker 
            status={vehicle.status} 
            speed={vehicle.speed} 
            plate={vehicle.plate}
            isSelected={selectedVehicle?.id === vehicle.id} 
          />
        );
      }
    });

    // Cleanup markers that are no longer in fleet
    const currentIds = new Set(vehicles.map(v => v.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].marker.remove();
        const rootToUnmount = markersRef.current[id].root;
        setTimeout(() => {
          try { rootToUnmount.unmount(); } catch (e) {}
        }, 0);
        delete markersRef.current[id];
      }
    });
  }, [vehicles, selectedVehicle]);


  // Update markers and sync with API
  React.useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/fleet-locations');
        const data = await response.json();
        
        if (data && data.length > 0) {
          const apiVehicles: VehicleLocation[] = data.map((v: any) => ({
            id: v.vehicleId,
            lat: v.lat,
            lng: v.lng,
            plate: v.vehicleId === 'TX-9011' ? 'TX-9011 (LIVE)' : v.vehicleId,
            model: v.vehicleId === 'TX-9011' ? 'Live Track Asset' : 'Managed Fleet',
            status: v.status === 'active' ? VehicleStatus.RENTED : VehicleStatus.AVAILABLE,
            speed: parseFloat(v.speed) || 0,
            fuel: 85, // Mock fuel for now
            vin: `VIN-${v.vehicleId}`
          }));

          // Merge with initial mock data
          setVehicles(prev => {
            const vehicleMap = new Map(INITIAL_VEHICLES.map(v => [v.id, v]));
            apiVehicles.forEach(apiV => {
              vehicleMap.set(apiV.id, apiV);
            });
            return Array.from(vehicleMap.values());
          });
        }
      } catch (error) {
        console.error("Failed to fetch fleet locations:", error);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Removed simulation logic and Firestore fallback

  const zoomIn = () => map.current?.zoomIn();
  const zoomOut = () => map.current?.zoomOut();
  const resetView = () => map.current?.flyTo({ center: [-75.1652, 39.9526], zoom: 12 });

  return (
    <div className="h-[calc(100vh-12rem)] w-full rounded-3xl overflow-hidden border border-white/5 relative group">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Overlays */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        <div className="bg-[#09090b]/90 backdrop-blur-md border border-[#27272a] p-4 rounded-xl w-64 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Fleet Status</h3>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Total Fleet</span>
              <span className="text-lg font-mono text-white leading-none">142 assets</span>
            </div>
            
            <div className="flex gap-1 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[75%]" />
              <div className="h-full bg-blue-500 w-[20%]" />
              <div className="h-full bg-amber-500 w-[5%]" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-tighter">75% Available</div>
              <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-tighter text-center">20% Rented</div>
              <div className="text-[8px] font-bold uppercase text-zinc-600 tracking-tighter text-right">5% Alerts</div>
            </div>
          </div>
        </div>

        <div className="bg-[#09090b]/90 backdrop-blur-md border border-[#27272a] p-4 rounded-xl w-64 shadow-2xl">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">Active Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg group hover:bg-red-500/20 transition-colors cursor-pointer">
              <AlertTriangle className="text-red-500 w-3 h-3 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-white leading-none tracking-tight">TX-9011 (SPEEDING)</p>
                <p className="text-[9px] text-red-500/80 mt-1.5 font-bold">104 mph • Zone: 65</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
        <div className="flex flex-col bg-[#09090b]/90 backdrop-blur-md border border-[#27272a] p-1 rounded-lg shadow-2xl">
          <button onClick={zoomIn} className="p-2.5 text-zinc-500 hover:text-white transition-colors rounded hover:bg-[#18181b]">
            <ZoomIn size={16} />
          </button>
          <div className="h-px bg-[#27272a] mx-2" />
          <button onClick={zoomOut} className="p-2.5 text-zinc-500 hover:text-white transition-colors rounded hover:bg-[#18181b]">
            <ZoomOut size={16} />
          </button>
        </div>
        <button onClick={resetView} className="p-3 bg-[#09090b]/90 backdrop-blur-md border border-[#27272a] text-zinc-500 hover:text-white rounded-lg shadow-2xl flex items-center justify-center transition-colors">
          <Target size={18} />
        </button>
      </div>

      {/* Detail Overlay */}
      {selectedVehicle && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-6 right-6 z-20 w-80 bg-[#09090b]/95 backdrop-blur-xl border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="p-6 relative">
            <button 
              onClick={() => setSelectedVehicle(null)}
              className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className={cn(
                "p-3 rounded-xl shadow-lg",
                selectedVehicle.status === VehicleStatus.RENTED ? "bg-blue-600/20 text-blue-500" : "bg-emerald-600/20 text-emerald-500"
              )}>
                <Car size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black italic uppercase tracking-tighter text-white">{selectedVehicle.model}</h4>
                <p className="text-[10px] font-black font-mono text-zinc-600 tracking-[0.2em] mt-0.5 uppercase">{selectedVehicle.plate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="text-blue-500 w-3 h-3" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Velocity</span>
                </div>
                <p className="text-lg font-mono text-white leading-none">{Math.round(selectedVehicle.speed)} <span className="text-[10px] text-zinc-600 italic">MPH</span></p>
              </div>
              <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-amber-500 w-3 h-3" />
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Charge</span>
                </div>
                <p className="text-lg font-mono text-white leading-none">{selectedVehicle.fuel}%</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em]">
                <span>Identifier</span>
                <span className="text-white font-mono lowercase">{selectedVehicle.vin.slice(0, 8)}...</span>
              </div>
              <button className="w-full py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors">
                Command Engine
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
