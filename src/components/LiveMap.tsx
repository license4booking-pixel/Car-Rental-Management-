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

export default function LiveMap() {
  const mapContainer = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<maplibregl.Map | null>(null);
  const markersRef = React.useRef<{ [key: string]: { marker: maplibregl.Marker, root: Root } }>({});
  const [selectedVehicle, setSelectedVehicle] = React.useState<VehicleLocation | null>(null);
  
  const [vehicles, setVehicles] = React.useState<VehicleLocation[]>([]);

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


  // Update markers and sync with Real Firebase Fleet
  React.useEffect(() => {
    if (!db) return;
    
    // Subscribe to Firestore vehicles
    const q = query(collection(db, 'vehicles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apiVehicles: VehicleLocation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Provide mock coordinates centered around philly if not available
        const lat = data.location?.lat || (39.9526 + (Math.random() - 0.5) * 0.1);
        const lng = data.location?.lng || (-75.1652 + (Math.random() - 0.5) * 0.1);
        
        apiVehicles.push({
          id: doc.id,
          lat,
          lng,
          plate: data.plateNumber || 'UNKNOWN',
          model: data.make ? `${data.make} ${data.model}` : 'Unknown Vehicle',
          status: data.status as VehicleStatus || VehicleStatus.AVAILABLE,
          speed: data.location?.speed || 0,
          fuel: data.fuelLevel || data.batteryLevel || 100,
          vin: data.vin || `VIN-${doc.id.slice(0, 8)}`
        });
      });
      setVehicles(apiVehicles);
    });

    return () => unsubscribe();
  }, []);

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
              <span className="text-lg font-mono text-white leading-none">142 vehicles</span>
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
