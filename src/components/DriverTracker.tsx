import React from 'react';
import { 
  Navigation, 
  MapPin, 
  Play, 
  Square, 
  AlertTriangle,
  Zap,
  Activity,
  Signal
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function DriverTracker() {
  const [isTracking, setIsTracking] = React.useState(false);
  const [location, setLocation] = React.useState<GeolocationPosition | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const watchId = React.useRef<number | null>(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setError(null);
    setIsTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation(position);
        sendUpdate(position);
      },
      (err) => {
        setError(`Error: ${err.message}`);
        setIsTracking(false);
        if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000
      }
    );
  };

  const stopTracking = () => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const sendUpdate = async (position: GeolocationPosition) => {
    try {
      await fetch('/api/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: 'TX-9011', // Mock ID as requested
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed ? (position.coords.speed * 3.6).toFixed(1) : 0, // km/h
          heading: position.coords.heading || 0,
          status: 'active'
        }),
      });
    } catch (err) {
      console.error("Failed to send location update:", err);
    }
  };

  React.useEffect(() => {
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  return (
    <div className="max-w-md mx-auto min-h-[80vh] flex flex-col p-6 space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
          <Navigation className={cn("transition-all duration-1000", isTracking && "animate-pulse")} size={32} />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Driver Interface</h1>
        <p className="text-zinc-500 text-sm font-medium">Clearance ID: <span className="text-zinc-300 font-mono">OPERATOR_9011</span></p>
      </div>

      <div className="flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#111113] border border-[#27272a] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
            <Zap size={20} className={cn(isTracking ? "text-emerald-500" : "text-zinc-600")} />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Telemetry</p>
            <p className="text-xl font-black text-white">{isTracking ? "ONLINE" : "OFFLINE"}</p>
          </div>
          <div className="bg-[#111113] border border-[#27272a] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
            <Signal size={20} className={cn(isTracking ? "text-blue-500" : "text-zinc-600")} />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">TX State</p>
            <p className="text-xl font-black text-white">{isTracking ? "SYNCING" : "IDLE"}</p>
          </div>
        </div>

        {location && isTracking && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111113] border border-[#27272a] rounded-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Real-time Data</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-600">v1.2.4-stable</span>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Coordinates</p>
                <p className="text-sm font-mono text-white">{location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Current Speed</p>
                <p className="text-xl font-black text-white">
                  {location.coords.speed ? (location.coords.speed * 3.6).toFixed(0) : 0} <span className="text-[10px] text-zinc-500">KM/H</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-rose-500 mt-0.5" size={16} />
            <p className="text-xs text-rose-500/80 font-medium">{error}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {!isTracking ? (
          <button 
            onClick={startTracking}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] group"
          >
            <Play className="group-hover:scale-110 transition-transform" />
            <span className="text-base font-black uppercase tracking-widest italic">Start Shift</span>
          </button>
        ) : (
          <button 
            onClick={stopTracking}
            className="w-full bg-rose-600/10 border border-rose-500/30 hover:bg-rose-600/20 text-rose-500 py-5 rounded-2xl flex items-center justify-center gap-3 transition-all"
          >
            <Square fill="currentColor" size={20} />
            <span className="text-base font-black uppercase tracking-widest italic">End Shift</span>
          </button>
        )}
        <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
          Authorized personnel only • GPS logging active
        </p>
      </div>
    </div>
  );
}
