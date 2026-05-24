import React from 'react';
import { Car, Zap, Wrench, AlertTriangle, Archive } from 'lucide-react';
import { VehicleStatus } from '../types';
import { cn } from '../lib/utils';

interface VehicleMarkerProps {
  status: VehicleStatus;
  speed: number;
  plate: string;
  isSelected?: boolean;
}

const VehicleMarker: React.FC<VehicleMarkerProps> = ({ status, speed, plate, isSelected = false }) => {
  const isSpeeding = speed > 100;

  const getIcon = () => {
    if (isSpeeding) return <AlertTriangle size={16} className="text-red-500" />;
    
    switch (status) {
      case VehicleStatus.AVAILABLE:
        return <Car size={16} className="text-emerald-400" />;
      case VehicleStatus.RENTED:
        return speed > 0 ? <Zap size={16} className="text-blue-400" /> : <Car size={16} className="text-blue-400" />;
      case VehicleStatus.MAINTENANCE:
        return <Wrench size={16} className="text-amber-400" />;
      case VehicleStatus.ARCHIVED:
        return <Archive size={16} className="text-zinc-500" />;
      default:
        return <Car size={16} className="text-zinc-300" />;
    }
  };

  const getStatusColor = () => {
    if (isSpeeding) return 'bg-red-500';
    switch (status) {
      case VehicleStatus.AVAILABLE:
        return 'bg-emerald-500';
      case VehicleStatus.RENTED:
        return 'bg-blue-500';
      case VehicleStatus.MAINTENANCE:
        return 'bg-amber-500';
      case VehicleStatus.ARCHIVED:
        return 'bg-zinc-600';
      default:
        return 'bg-zinc-400';
    }
  };

  return (
    <div className="relative group cursor-pointer transition-transform hover:scale-110 active:scale-95">
      <div 
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center bg-[#09090b] border transition-all duration-300 shadow-2xl overflow-visible",
          isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-white/10",
          isSpeeding && "shadow-[0_0_20px_rgba(239,68,68,0.4)] border-red-500/50"
        )}
      >
        {getIcon()}

        {/* Status indicator dot */}
        <div className={cn(
          "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#09090b] shadow-lg",
          getStatusColor(),
          isSpeeding && "animate-pulse"
        )} />
      </div>

      {/* Hover Information Label */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-50">
        <div className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-2xl flex flex-col items-center gap-0.5 min-w-[80px]">
          <span className="text-[10px] font-black italic text-white uppercase tracking-wider">{plate}</span>
          <span className="text-[8px] font-bold text-zinc-500 uppercase flex items-center gap-1">
            <div className={cn("w-1 h-1 rounded-full", getStatusColor())} />
            {speed > 0 ? `${Math.round(speed)} MPH` : status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Speeding Pulse Ring */}
      {isSpeeding && (
        <div className="absolute inset-0 w-full h-full rounded-full border-2 border-red-500 animate-ping opacity-20 pointer-events-none" />
      )}
    </div>
  );
};

export default VehicleMarker;
