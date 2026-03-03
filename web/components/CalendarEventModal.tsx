'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Palette, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const COLORS = [
    { label: 'Yellow', value: '#FFD700' },
    { label: 'Blue', value: '#3B82F6' },
    { label: 'Green', value: '#22C55E' },
    { label: 'Purple', value: '#A855F7' },
    { label: 'Red', value: '#EF4444' },
    { label: 'Orange', value: '#F97316' },
];

interface CalendarEventModalProps {
    title: string;
    onClose: () => void;
    onSaved?: () => void;
}

export default function CalendarEventModal({ title, onClose, onSaved }: CalendarEventModalProps) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [color, setColor] = useState('#FFD700');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Set default date to tomorrow
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().split('T')[0]);
    }, []);

    const handleSave = async () => {
        if (!date) return;
        setSaving(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const startTime = new Date(`${date}T${time}:00`);
            const endDateTime = new Date(`${date}T${endTime}:00`);

            const { error: insertError } = await supabase.from('calendar_events').insert({
                user_id: user.id,
                title,
                start_time: startTime.toISOString(),
                end_time: endDateTime.toISOString(),
                color,
            });

            if (insertError) {
                console.error("[Calendar] Supreme insert error payload:", insertError);
                throw new Error(insertError.message);
            }

            setSaved(true);
            setTimeout(() => {
                onSaved?.();
                onClose();
            }, 1000);
        } catch (err) {
            console.error('Failed to save calendar event:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
                >
                    {/* Header */}
                    <div className="h-2 w-full bg-gradient-to-r from-[#FFD700] to-[#E6C200]" />
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#FEF9C3] flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-[#CA8A04]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Schedule Study Session</h3>
                                    <p className="text-xs text-gray-500">Add to your calendar</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Title (read-only) */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Topic</label>
                            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium text-sm truncate">
                                {title}
                            </div>
                        </div>

                        {/* Date */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                            />
                        </div>

                        {/* Time */}
                        <div className="mb-5 flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    <Clock className="w-3 h-3 inline mr-1" />Start
                                </label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    <Clock className="w-3 h-3 inline mr-1" />End
                                </label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    min={time}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Color */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                <Palette className="w-3 h-3 inline mr-1" />Event Color
                            </label>
                            <div className="flex gap-3">
                                {COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => setColor(c.value)}
                                        title={c.label}
                                        className={`w-8 h-8 rounded-full border-4 transition-transform hover:scale-110 active:scale-95 ${color === c.value ? 'border-gray-700 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c.value }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Save button */}
                        <button
                            onClick={handleSave}
                            disabled={saving || saved || !date}
                            className={`w-full py-3.5 rounded-xl font-bold text-gray-900 transition-all shadow-md active:scale-95 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${saved ? 'bg-green-500 text-white' : 'bg-[#FFD700] hover:bg-[#E6C200] disabled:opacity-60'
                                }`}
                        >
                            {saving ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                            ) : saved ? (
                                <>✓ Added to Calendar</>
                            ) : (
                                <>Add to Calendar</>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
