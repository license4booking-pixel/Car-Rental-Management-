import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Filter,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';

interface RentalEvent {
  id: string;
  title: string;
  date: Date;
  status: 'active' | 'scheduled' | 'returning';
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const events: RentalEvent[] = [
    {
      id: '1',
      title: 'D. Smith - Model 3',
      date: new Date(),
      status: 'active'
    }
  ];

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Operations Calendar</h1>
          <p className="text-zinc-500 text-sm mt-1">Unified view of all fleet movements and bookings.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#111113] border border-[#27272a] rounded-lg p-1 flex">
            <button onClick={prevMonth} className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 flex items-center text-[10px] font-black uppercase tracking-widest text-white min-w-[120px] justify-center">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors">
            <CalendarIcon size={14} /> Today
          </button>
        </div>
      </div>

      <div className="bg-[#09090b] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 border-b border-[#27272a]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest border-r border-[#27272a] last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = events.filter(e => isSameDay(e.date, day));
            
            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "min-h-[140px] p-2 border-r border-b border-[#27272a] transition-colors hover:bg-white/[0.02]",
                  !isSameMonth(day, monthStart) && "bg-white/[0.01]",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={cn(
                    "w-6 h-6 flex items-center justify-center text-[10px] font-black tracking-tight rounded-md",
                    isToday(day) ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "text-zinc-500"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      className="px-2 py-1 bg-blue-600/10 border-l-2 border-blue-600 rounded-r text-[9px] font-bold text-blue-400 truncate uppercase tracking-tight"
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
