'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { motion } from 'framer-motion';
import {
  Clock, CheckCircle2, BrainCircuit, TrendingUp, Loader2,
  BookOpen, Trophy, Zap, Flame, Star
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ActivityCalendar } from 'react-activity-calendar';

// Weekly bar chart — computed from study_sessions grouped by day-of-week
function WeeklyBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="flex items-end gap-2 h-28 mt-4">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            className="w-full rounded-t-lg bg-[#FFD700]"
            initial={{ height: 0 }}
            animate={{ height: `${Math.round((val / max) * 100)}%` }}
            transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
            style={{ minHeight: val > 0 ? 4 : 0 }}
          />
          <span className="text-[10px] text-gray-400 font-medium">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function LearningReportPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [totalStudyHours, setTotalStudyHours] = useState('0.0');
  const [weeklyMinutes, setWeeklyMinutes] = useState('0');
  const [completedNodes, setCompletedNodes] = useState(0);
  const [totalNodes, setTotalNodes] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [activityData, setActivityData] = useState<any[]>([]);

  // Achievements
  const [achievements, setAchievements] = useState<any[]>([]);
  const [allBadges, setAllBadges] = useState<any[]>([]);

  // Skill distribution by roadmap
  const [roadmapStats, setRoadmapStats] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const [roadmapsRes, progressRes, achievementsRes, badgesRes] = await Promise.all([
        supabase.from('roadmaps').select('id, topic').eq('user_id', user.id),
        supabase.from('node_progress').select('node_id, roadmap_id, is_completed').eq('user_id', user.id),
        supabase.from('user_achievements').select('badge_id, earned_at, badges(id, name, description, icon)').eq('user_id', user.id).order('earned_at', { ascending: false }),
        supabase.from('badges').select('*'),
      ]);

      // Gracefully fetch study_sessions (table may not exist yet)
      let sessionsRes: { data: any[] | null } = { data: null };
      try {
        sessionsRes = await supabase.from('study_sessions').select('duration_minutes, studied_at').eq('user_id', user.id);
      } catch (_) { /* study_sessions table may not exist yet */ }

      // --- Completion Rate ---
      const allProgress = progressRes.data || [];
      const completedCount = allProgress.filter((p: any) => p.is_completed).length;

      // Get total nodes across all user roadmaps
      let total = 0;
      const roadmaps = roadmapsRes.data || [];
      const statsPromises = roadmaps.map(async (r: any) => {
        const { count } = await supabase.from('roadmap_nodes').select('node_id', { count: 'exact' }).eq('roadmap_id', r.id);
        const done = allProgress.filter((p: any) => p.roadmap_id === r.id && p.is_completed).length;
        total += count || 0;
        return {
          title: r.topic || 'Untitled',
          completed: done,
          total: count || 0,
          pct: count ? Math.round((done / count) * 100) : 0,
        };
      });
      const stats = await Promise.all(statsPromises);
      setRoadmapStats(stats);
      setCompletedNodes(completedCount);
      setTotalNodes(total);
      setCompletionRate(total > 0 ? Math.round((completedCount / total) * 100) : 0);

      // --- Study Sessions ---
      const sessions = sessionsRes?.data || [];
      let totalMins = 0;
      let thisWeekMins = 0;
      const weekBuckets = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
      const heatmapAgg: Record<string, number> = {};

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday

      sessions.forEach((s: any) => {
        const mins = s.duration_minutes || 0;
        totalMins += mins;
        const d = new Date(s.studied_at);
        const dateStr = d.toISOString().split('T')[0];
        heatmapAgg[dateStr] = (heatmapAgg[dateStr] || 0) + mins;
        const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
        weekBuckets[dayIdx] += mins;
        if (d >= weekStart) thisWeekMins += mins;
      });

      setTotalStudyHours((totalMins / 60).toFixed(1));
      setWeeklyMinutes(String(thisWeekMins));
      setWeeklyActivity(weekBuckets);

      const heatmapData = Object.entries(heatmapAgg).map(([date, minutes]) => {
        let level = 0;
        if (minutes > 0 && minutes <= 30) level = 1;
        else if (minutes <= 60) level = 2;
        else if (minutes <= 120) level = 3;
        else level = 4;
        return { date, count: minutes, level };
      });
      setActivityData(heatmapData);

      // --- Achievements ---
      setAchievements(achievementsRes.data || []);
      setAllBadges(badgesRes.data || []);

      setIsLoading(false);
    };

    fetchAll();
  }, []);

  const earnedBadgeIds = new Set(achievements.map((a: any) => a.badge_id));
  const badgeIcons: Record<string, string> = {
    first_step: '🌱', on_a_roll: '🔥', module_master: '🎓', speed_learner: '⚡', bookworm: '📚',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-7xl z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Sidebar />

          <section className="lg:col-span-3 flex flex-col gap-6">

            {/* Header */}
            <div>
              <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">Learning Report</h1>
              <p className="text-gray-500 text-sm">Your real-time progress, habits, and achievements.</p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-10 h-10 animate-spin text-[#FFD700]" />
              </div>
            ) : (
              <>
                {/* --- KPI Cards --- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: Clock, label: 'Total Study Time', value: `${totalStudyHours}h`, sub: `${weeklyMinutes} min this week`, color: 'bg-yellow-50 text-[#CA8A04]' },
                    { icon: CheckCircle2, label: 'Modules Done', value: completedNodes, sub: `of ${totalNodes} total`, color: 'bg-green-50 text-green-600' },
                    { icon: BrainCircuit, label: 'Completion Rate', value: `${completionRate}%`, sub: 'across all roadmaps', color: 'bg-blue-50 text-blue-500' },
                    { icon: Trophy, label: 'Badges Earned', value: achievements.length, sub: `of ${allBadges.length} available`, color: 'bg-purple-50 text-purple-500' },
                  ].map(({ icon: Icon, label, value, sub, color }, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.35, ease: 'easeOut' }}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
                      <p className="font-display text-2xl font-bold text-gray-900">{value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </motion.div>
                  ))}
                </div>

                {/* --- Charts Row --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Heatmap (2/3 width) */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}
                    className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-display text-lg font-bold text-gray-900">Study Activity</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-3 h-3 rounded bg-[#FFD700]" /> minutes per day
                      </div>
                    </div>
                    {activityData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <ActivityCalendar
                          data={activityData}
                          theme={{ light: ['#f0f0f0', '#fee783', '#fede49', '#fdd600', '#c2a100'] }}
                          labels={{
                            legend: { less: 'Less', more: 'More' },
                            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                            totalCount: '{{count}} mins studied in {{year}}',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-400">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                        <p className="text-sm">No study activity yet.</p>
                        <p className="text-xs mt-1">Complete a module to start tracking your streak!</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Weekly bar chart (1/3 width) */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.35 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-display text-lg font-bold text-gray-900 mb-1">This Week</h3>
                    <p className="text-xs text-gray-400 mb-2">Minutes studied per day</p>
                    <WeeklyBarChart data={weeklyActivity} />
                    <p className="text-xs text-gray-400 mt-4 text-center">
                      {weeklyActivity.some(v => v > 0) ? `${weeklyMinutes} min total this week` : 'No sessions this week yet'}
                    </p>
                  </motion.div>
                </div>

                {/* --- Roadmap Progress --- */}
                {roadmapStats.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.35 }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <h3 className="font-display text-lg font-bold text-gray-900 mb-5">Roadmap Progress</h3>
                    <div className="space-y-4">
                      {roadmapStats.map((r, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm font-bold text-gray-900 capitalize">{r.title}</span>
                            <span className="text-xs font-bold text-gray-500">{r.completed}/{r.total} modules · {r.pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className={`h-2 rounded-full ${r.pct === 100 ? 'bg-green-500' : 'bg-[#FFD700]'}`}
                              initial={{ width: 0 }} animate={{ width: `${r.pct}%` }}
                              transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* --- Achievements / Badges --- */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52, duration: 0.35 }}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-display text-lg font-bold text-gray-900">Achievements</h3>
                    <span className="text-xs text-gray-400 font-medium">{achievements.length} / {allBadges.length} earned</span>
                  </div>

                  {allBadges.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Run the SQL setup to enable achievements ✨
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allBadges.map((badge: any) => {
                        const earned = earnedBadgeIds.has(badge.id);
                        const earnedData = achievements.find((a: any) => a.badge_id === badge.id);
                        return (
                          <motion.div key={badge.id}
                            whileHover={{ y: -2 }}
                            className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${earned
                              ? 'border-[#FFD700] bg-[#FEF9C3]/30'
                              : 'border-gray-100 bg-gray-50 opacity-50 grayscale'
                              }`}>
                            <span className="text-3xl leading-none mt-0.5 flex-shrink-0">
                              {badge.icon || badgeIcons[badge.id] || '🏅'}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">{badge.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{badge.description}</p>
                              {earned && earnedData && (
                                <p className="text-xs text-[#CA8A04] font-bold mt-1">
                                  ✓ Earned {new Date(earnedData.earned_at).toLocaleDateString()}
                                </p>
                              )}
                              {!earned && (
                                <p className="text-xs text-gray-400 mt-1">Not yet earned</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}