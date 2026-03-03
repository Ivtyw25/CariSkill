import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useStudyTracker(skillId: string) {
    const supabase = createClient();

    // Track how many minutes have passed in the current session
    const activeMinutesRef = useRef(0);

    // Track the timestamp of the last ping to calculate elapsed time accurately
    const lastPingTimeRef = useRef<number>(Date.now());

    // ID of the setInterval timer
    const timerIdRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!skillId) return;

        const startTracking = () => {
            lastPingTimeRef.current = Date.now();

            // Ping every 1 minute
            timerIdRef.current = setInterval(async () => {
                // Double check document visibility
                if (document.visibilityState !== 'visible') return;

                const now = Date.now();
                // Calculate minutes passed since last ping (should be ~1)
                const elapsedMinutes = Math.round((now - lastPingTimeRef.current) / 60000);

                if (elapsedMinutes > 0) {
                    activeMinutesRef.current += elapsedMinutes;
                    lastPingTimeRef.current = now;

                    await pingDatabase(elapsedMinutes);
                }
            }, 60000); // 60,000 ms = 1 minute
        };

        const stopTracking = () => {
            if (timerIdRef.current) {
                clearInterval(timerIdRef.current);
                timerIdRef.current = null;
            }
        };

        const pingDatabase = async (minutesToLog: number) => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const today = new Date().toISOString().split('T')[0];

                // 1. Check if studying session for today already exists
                const { data: existingSession, error: checkError } = await supabase
                    .from('study_sessions')
                    .select('id, duration_minutes')
                    .eq('user_id', user.id)
                    .eq('skill_id', skillId)
                    .eq('date', today)
                    .single();

                if (existingSession) {
                    // Update existing
                    await supabase
                        .from('study_sessions')
                        .update({ duration_minutes: existingSession.duration_minutes + minutesToLog })
                        .eq('id', existingSession.id);
                } else if (checkError?.code === 'PGRST116') { // PGRST116 = No rows found
                    // Insert new
                    await supabase
                        .from('study_sessions')
                        .insert({
                            user_id: user.id,
                            skill_id: skillId,
                            duration_minutes: minutesToLog,
                            date: today,
                        });
                }

                // 2. Also update the total_time_spent on the user_skills table
                const { data: existingSkill } = await supabase
                    .from('user_skills')
                    .select('total_time_spent')
                    .eq('id', skillId)
                    .single();

                if (existingSkill) {
                    await supabase
                        .from('user_skills')
                        .update({ total_time_spent: (existingSkill.total_time_spent || 0) + minutesToLog })
                        .eq('id', skillId);
                }
            } catch (e) {
                console.error("Study tracking failed:", e);
            }
        };

        // Handle user switching tabs
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startTracking();
            } else {
                stopTracking();
            }
        };

        // Initial Start
        if (document.visibilityState === 'visible') {
            startTracking();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopTracking();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [skillId, supabase]);

    return { activeMinutes: activeMinutesRef.current };
}
