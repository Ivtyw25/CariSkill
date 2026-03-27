'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Map, PlusCircle, Clock, ArrowRight, Loader2, BookOpen, Users, Calendar, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface RoadmapRecord {
  id: string;
  topic: string;
  created_at: string;
  content: any;
  priority?: number;
  isSaved?: boolean;
}

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchRoadmaps = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      // Fetch user's own generated roadmaps
      const { data: ownData, error: ownError } = await supabase
        .from('roadmaps')
        .select('id, topic, created_at, content, priority')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const ownRoadmaps: RoadmapRecord[] = (!ownError && ownData) ? ownData.map(r => ({ ...r, isSaved: false, priority: r.priority || 1 })) : [];

      let savedRoadmaps: RoadmapRecord[] = [];
      try {
        const savedRes = await fetch('/api/community/saved-roadmaps', { credentials: 'include' });
        if (savedRes.ok) {
          const { roadmaps: savedData } = await savedRes.json();
          if (savedData && savedData.length > 0) {
            savedRoadmaps = savedData.map((r: any) => ({ ...r, isSaved: true, priority: r.priority || 1 }));
          }
        }
      } catch (e) {
        console.error('Failed to fetch saved roadmaps:', e);
      }


      // Merge and deduplicate by id
      const ownIds = new Set(ownRoadmaps.map(r => r.id));
      const dedupedSaved = savedRoadmaps.filter(r => !ownIds.has(r.id));

      const merged = [...ownRoadmaps, ...dedupedSaved];
      // Chronological sort for timeline: Oldest first (or newest? timeline usually flows forward)
      // Let's go Oldest first within sections so the timeline represents progression
      merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setRoadmaps(merged);
      setLoading(false);
    };
    fetchRoadmaps();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getPhaseCount = (content: any): number => {
    try {
      const c = typeof content === 'string' ? JSON.parse(content) : content;
      const roadmap = c?.roadmap || c;
      return (roadmap?.phases || roadmap?.learning_path || roadmap?.modules || []).length;
    } catch { return 0; }
  };

  const handleTogglePriority = async (e: React.MouseEvent, roadmapId: string, currentPriority: number, isSaved: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    // Sequence: 1 (Curiosity) -> 2 (Building) -> 3 (Vital) -> 1
    const newPriority = currentPriority === 1 ? 2 : currentPriority === 2 ? 3 : 1;

    // Optimistic update
    setRoadmaps(prev => prev.map(rm => rm.id === roadmapId ? { ...rm, priority: newPriority } : rm));

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_roadmaps')
          .update({ priority: newPriority })
          .eq('roadmap_id', roadmapId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roadmaps')
          .update({ priority: newPriority })
          .eq('id', roadmapId);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
      // Rollback on error
      setRoadmaps(prev => prev.map(rm => rm.id === roadmapId ? { ...rm, priority: currentPriority } : rm));
    }
  };

  const priorityConfig = {
    3: {
      label: 'Vital Skill', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', dot: 'bg-red-500',
      glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:border-red-300',
      line: 'bg-red-200'
    },
    2: {
      label: 'Building Block', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', dot: 'bg-yellow-500',
      glow: 'hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:border-yellow-300',
      line: 'bg-yellow-200'
    },
    1: {
      label: 'Curiosity', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', dot: 'bg-green-500',
      glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:border-green-300',
      line: 'bg-green-200'
    },
  };

  const grouped = {
    high: roadmaps.filter(rm => rm.priority === 3),
    medium: roadmaps.filter(rm => (rm.priority || 1) === 2),
    low: roadmaps.filter(rm => (rm.priority || 1) === 1),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <Navbar isLoggedIn={!!user} />

      <main className="flex-grow px-6 py-12 max-w-5xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Map className="text-yellow-500 w-8 h-8" />
              My Roadmaps
            </h1>
            <p className="text-gray-500 mt-1">Your generated and saved learning roadmaps</p>
          </div>
          <Link
            href="/setup"
            className="flex items-center gap-2 bg-[#FFD900] hover:bg-yellow-400 text-gray-900 font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm border border-black/10"
          >
            <PlusCircle size={18} />
            New Roadmap
          </Link>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        ) : roadmaps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-5 border-2 border-yellow-200">
              <BookOpen className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No roadmaps yet</h2>
            <p className="text-gray-500 mb-6">Chat with the AI to generate your first personalised learning roadmap.</p>
            <Link
              href="/setup"
              className="flex items-center gap-2 bg-[#FFD900] hover:bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-xl transition-colors shadow-md border border-black/10"
            >
              <PlusCircle size={18} />
              Create Your First Roadmap
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-16 pb-20">
            {[
              { key: 'high', id: 3, ...priorityConfig[3] },
              { key: 'medium', id: 2, ...priorityConfig[2] },
              { key: 'low', id: 1, ...priorityConfig[1] },
            ].map((section) => {
              const list = grouped[section.key as keyof typeof grouped];
              if (list.length === 0) return null;

              return (
                <section key={section.key} className="relative">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className={`w-3.5 h-3.5 rounded-full ${section.dot} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} />
                    <h2 className={`text-2xl font-bold tracking-tight ${section.color}`}>{section.label}</h2>
                    <span className="text-gray-300 text-lg font-medium">/ {list.length}</span>
                  </div>

                  {/* Horizontal Timeline Container */}
                  <div className="relative group mt-4">
                    {/* Decorative Timeline Line (at the bottom, aligned with nodes) */}
                    <div className={`absolute bottom-[52px] left-0 right-0 h-1 ${section.line} rounded-full z-0 opacity-70 shadow-sm`} />

                    <div className="flex overflow-x-auto gap-10 pb-20 pt-12 px-4 no-scrollbar snap-x snap-mandatory">

                      {/* 🌟 THE DEMO HACK INJECTED HERE 🌟 */}
                      {list.filter((rm) => {
                        const topicName = (rm.topic || '').toLowerCase();
                        const isBakery = topicName.includes('baking') || topicName.includes('bakery');
                        return isBakery ? rm.id === '26e45a75-3a48-4b35-b460-7a4827232497' : true;
                      }).map((rm, idx) => {

                        const phases = getPhaseCount(rm.content);
                        const config = priorityConfig[(rm.priority || 1) as keyof typeof priorityConfig];
                        const dateFormatted = new Date(rm.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

                        return (
                          <motion.div
                            key={rm.id}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -16, scale: 1.05 }}
                            transition={{
                              delay: idx * 0.1,
                              type: 'spring',
                              stiffness: 400,
                              damping: 25
                            }}
                            layout
                            className="flex-shrink-0 w-[300px] snap-center relative z-10"
                          >
                            <Link
                              href={`/skill/${rm.id}/overview`}
                              className={`group block bg-white rounded-2xl border-2 ${config.border} p-6 transition-all duration-300 ${config.glow} shadow-sm mb-12 outline-none translate-y-0`}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center border ${config.border} shrink-0`}>
                                  {rm.isSaved ? (
                                    <Users className={`w-6 h-6 ${config.color}`} />
                                  ) : (
                                    <Map className={`w-6 h-6 ${config.color}`} />
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => handleTogglePriority(e, rm.id, rm.priority || 1, !!rm.isSaved)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.border} ${config.bg} ${config.color} text-[9px] font-bold uppercase tracking-wider hover:brightness-95 transition-all shadow-sm`}
                                    title="Toggle Priority"
                                  >
                                    <AlertCircle size={10} />
                                    {config.label}
                                  </button>
                                </div>
                              </div>

                              <h3 className="font-bold text-gray-900 text-lg leading-snug mb-3 group-hover:text-yellow-700 transition-colors line-clamp-2 min-h-[3.5rem]">
                                {rm.topic}
                              </h3>

                              <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-[11px] font-medium uppercase tracking-wider text-gray-400">
                                {phases > 0 ? (
                                  <span className={`px-2 py-0.5 rounded-md ${config.bg} ${config.color}`}>
                                    {phases} modules
                                  </span>
                                ) : <span>-</span>}
                                {rm.isSaved && (
                                  <span className="text-blue-500 font-bold tracking-widest">
                                    Saved
                                  </span>
                                )}
                              </div>
                            </Link>

                            {/* Timeline Node & Connector */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                              {/* Vertical Line Connector (adjusted to hit the bottom line) */}
                              <div className={`w-0.5 h-16 ${section.line} opacity-70 mb-0`} />

                              {/* Node Circle (aligned with the h-1 line) */}
                              <div className={`w-4 h-4 rounded-full border-4 border-white shadow-md z-20 ${config.dot} -mt-2`} />

                              {/* Date Label Below Node */}
                              <div className="mt-3 text-[10px] font-bold tracking-tighter text-gray-400 bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100 whitespace-nowrap">
                                {dateFormatted}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Spacer for scroll end */}
                      <div className="flex-shrink-0 w-48" />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

