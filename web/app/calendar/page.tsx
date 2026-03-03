'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, Calendar, AlignLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM'
  end_time: string;   // 'HH:MM'
  color: string;
  notes: string;
}

type ViewMode = 'month' | 'week' | 'day';

const COLOR_PRESETS = [
  { hex: '#FFD700', label: 'Yellow' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#10B981', label: 'Green' },
  { hex: '#EF4444', label: 'Red' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#F97316', label: 'Orange' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatHour = (h: number) => {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
};

const minutesFraction = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
};

const getWeekStart = (d: Date) => {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay());
  return s;
};

// ─── Event Modal ──────────────────────────────────────────────────────────────
interface ModalProps {
  initial: Partial<CalendarEvent>;
  onSave: (e: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

function EventModal({ initial, onSave, onDelete, onClose }: ModalProps) {
  const [form, setForm] = useState<CalendarEvent>({
    id: initial.id || '',
    title: initial.title || '',
    date: initial.date || toYMD(new Date()),
    start_time: initial.start_time || '09:00',
    end_time: initial.end_time || '10:00',
    color: initial.color || '#FFD700',
    notes: initial.notes || '',
  });

  const set = (k: keyof CalendarEvent, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header stripe */}
        <div className="h-1.5 w-full" style={{ backgroundColor: form.color }} />

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">{form.id ? 'Edit Event' : 'New Event'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Title */}
          <input
            autoFocus
            type="text"
            placeholder="Add title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && form.title.trim() && onSave(form)}
            className="w-full text-xl font-semibold border-b-2 border-gray-200 focus:border-yellow-400 outline-none pb-2 text-gray-900 placeholder-gray-300 transition-colors"
          />

          {/* Date & Time row */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-gray-400 shrink-0" />
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => set('start_time', e.target.value)}
                  className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
                <span className="text-gray-400 text-sm">→</span>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={e => set('end_time', e.target.value)}
                  className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
            </div>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => set('color', c.hex)}
                  title={c.label}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c.hex }}
                >
                  {form.color === c.hex && <Check size={12} className="text-gray-900/70" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex items-start gap-3">
            <AlignLeft size={16} className="text-gray-400 shrink-0 mt-2" />
            <textarea
              placeholder="Add notes..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none placeholder-gray-300"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {form.id && onDelete ? (
              <button
                onClick={() => onDelete(form.id)}
                className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            ) : <div />}
            <div className="flex gap-2">
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => form.title.trim() && onSave(form)}
                disabled={!form.title.trim()}
                className="bg-[#FFD700] hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-bold text-sm px-5 py-2 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; initial: Partial<CalendarEvent> }>({ open: false, initial: {} });

  const today = new Date();
  const todayYMD = toYMD(today);

  // ── Fetch events ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });
        if (data) setEvents(data);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  // Auto-scroll to 8am in week/day view
  useEffect(() => {
    if ((view === 'week' || view === 'day') && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60; // 8am = 480px (60px per hour)
    }
  }, [view]);

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const saveEvent = async (ev: CalendarEvent) => {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...ev, user_id: user?.id };

    if (ev.id) {
      const { data } = await supabase.from('calendar_events').update(payload).eq('id', ev.id).select().single();
      if (data) setEvents(prev => prev.map(e => e.id === data.id ? data : e));
    } else {
      const { data } = await supabase.from('calendar_events').insert({ ...payload, id: undefined }).select().single();
      if (data) setEvents(prev => [...prev, data]);
    }
    setModal({ open: false, initial: {} });
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setModal({ open: false, initial: {} });
  };

  const openCreate = (date: string, hour?: number) => {
    const start = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    const end = hour !== undefined ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00';
    setModal({ open: true, initial: { date, start_time: start, end_time: end } });
  };

  const openEdit = (ev: CalendarEvent) => setModal({ open: true, initial: ev });

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navigate = (dir: 1 | -1) => {
    setCurrentDate(d => {
      const n = new Date(d);
      if (view === 'month') n.setMonth(n.getMonth() + dir);
      else if (view === 'week') n.setDate(n.getDate() + 7 * dir);
      else n.setDate(n.getDate() + dir);
      return n;
    });
  };

  const headerLabel = () => {
    if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${ws.toLocaleString('default', { month: 'short', day: 'numeric' })} – ${we.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const eventsOnDate = (ymd: string) => events.filter(e => e.date === ymd);

  // ── Month View ───────────────────────────────────────────────────────────────
  const MonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const blanks = Array.from({ length: firstDay });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-7 flex-1 border-l border-t border-gray-100">
          {blanks.map((_, i) => <div key={`b${i}`} className="border-r border-b border-gray-100 min-h-[110px] bg-gray-50/30" />)}
          {days.map(day => {
            const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = eventsOnDate(ymd);
            const isToday = ymd === todayYMD;
            return (
              <div
                key={day}
                onClick={() => openCreate(ymd)}
                className="border-r border-b border-gray-100 min-h-[110px] p-1.5 cursor-pointer hover:bg-yellow-50/50 transition-colors group"
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 transition-colors
                  ${isToday ? 'bg-[#FFD700] text-gray-900 font-bold' : 'text-gray-700 group-hover:bg-yellow-100'}`}>
                  {day}
                </div>
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); openEdit(ev); }}
                      className="text-[10px] leading-none px-1.5 py-1 rounded font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: ev.color + '30', color: ev.color === '#FFD700' ? '#92660A' : ev.color, borderLeft: `2.5px solid ${ev.color}` }}
                    >
                      {ev.start_time && <span className="opacity-70 mr-1">{ev.start_time}</span>}
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Week View ────────────────────────────────────────────────────────────────
  const WeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
    });

    return (
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100 shrink-0">
          <div />
          {weekDays.map((d, i) => {
            const ymd = toYMD(d);
            const isToday = ymd === todayYMD;
            return (
              <div key={i} className="text-center py-2 border-l border-gray-100">
                <div className="text-xs font-medium text-gray-400 uppercase">{DAYS_OF_WEEK[i]}</div>
                <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold mt-0.5
                  ${isToday ? 'bg-[#FFD700] text-gray-900' : 'text-gray-700'}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] relative">
            {/* Hours column */}
            <div className="flex flex-col">
              {HOURS.map(h => (
                <div key={h} className="h-[60px] flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-gray-400">{h > 0 ? formatHour(h) : ''}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((d, di) => {
              const ymd = toYMD(d);
              const dayEvents = eventsOnDate(ymd);
              return (
                <div key={di} className="border-l border-gray-100 relative">
                  {HOURS.map(h => (
                    <div
                      key={h}
                      onClick={() => openCreate(ymd, h)}
                      className="h-[60px] border-b border-gray-50 hover:bg-yellow-50/40 cursor-pointer transition-colors"
                    />
                  ))}
                  {/* Events as absolute blocks */}
                  {dayEvents.map(ev => {
                    const top = minutesFraction(ev.start_time || '00:00') * 60;
                    const bottom = minutesFraction(ev.end_time || '01:00') * 60;
                    const height = Math.max(bottom - top, 20);
                    return (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); openEdit(ev); }}
                        className="absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                        style={{ top: `${top}px`, height: `${height}px`, backgroundColor: ev.color + '25', borderLeft: `3px solid ${ev.color}` }}
                      >
                        <div className="text-[10px] font-semibold truncate" style={{ color: ev.color === '#FFD700' ? '#92660A' : ev.color }}>
                          {ev.title}
                        </div>
                        <div className="text-[9px] text-gray-500">{ev.start_time}–{ev.end_time}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Day View ─────────────────────────────────────────────────────────────────
  const DayView = () => {
    const ymd = toYMD(currentDate);
    const dayEvents = eventsOnDate(ymd);

    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="text-center py-3 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-800">
            {currentDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[56px_1fr] relative">
            <div className="flex flex-col">
              {HOURS.map(h => (
                <div key={h} className="h-[60px] flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-gray-400">{h > 0 ? formatHour(h) : ''}</span>
                </div>
              ))}
            </div>
            <div className="border-l border-gray-100 relative">
              {HOURS.map(h => (
                <div
                  key={h}
                  onClick={() => openCreate(ymd, h)}
                  className="h-[60px] border-b border-gray-50 hover:bg-yellow-50/40 cursor-pointer transition-colors"
                />
              ))}
              {dayEvents.map(ev => {
                const top = minutesFraction(ev.start_time || '00:00') * 60;
                const height = Math.max((minutesFraction(ev.end_time || '01:00') - minutesFraction(ev.start_time || '00:00')) * 60, 24);
                return (
                  <div
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); openEdit(ev); }}
                    className="absolute left-1 right-2 rounded-lg px-3 py-1.5 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                    style={{ top: `${top}px`, height: `${height}px`, backgroundColor: ev.color + '30', borderLeft: `4px solid ${ev.color}` }}
                  >
                    <div className="font-semibold text-sm truncate" style={{ color: ev.color === '#FFD700' ? '#92660A' : ev.color }}>{ev.title}</div>
                    <div className="text-xs text-gray-500">{ev.start_time} – {ev.end_time}</div>
                    {ev.notes && <div className="text-xs text-gray-400 truncate mt-0.5">{ev.notes}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-7xl z-10 flex gap-6">
          <Sidebar />

          <section className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h1 className="font-display text-2xl font-bold text-gray-900">Study Calendar</h1>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => openCreate(todayYMD)}
                className="flex items-center gap-2 bg-[#FFD700] text-gray-900 font-bold px-4 py-2 rounded-xl shadow-sm text-sm"
              >
                <Plus size={16} strokeWidth={3} /> Create
              </motion.button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
              {/* Calendar toolbar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronLeft size={18} /></button>
                  <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ChevronRight size={18} /></button>
                  <span className="font-bold text-gray-800 ml-1 text-sm">{headerLabel()}</span>
                </div>

                {/* View switcher */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-sm font-medium">
                  {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-3 py-1.5 rounded-md capitalize transition-colors ${view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* View content */}
              <div className="flex-1 min-h-0 flex flex-col p-3">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-7 h-7 border-2 border-yellow-400 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={view}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      {view === 'month' && <MonthView />}
                      {view === 'week' && <WeekView />}
                      {view === 'day' && <DayView />}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Event Modal */}
      <AnimatePresence>
        {modal.open && (
          <EventModal
            initial={modal.initial}
            onSave={saveEvent}
            onDelete={modal.initial.id ? deleteEvent : undefined}
            onClose={() => setModal({ open: false, initial: {} })}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}