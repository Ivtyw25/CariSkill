'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Clock, PlayCircle, Loader2 } from 'lucide-react';
import type { SkillStatus } from '@/lib/profile-data';

export default function ProfilePage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<SkillStatus>('Ongoing');
  const [skills, setSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      // Fetch all user roadmaps
      const { data: roadmaps } = await supabase
        .from('roadmaps')
        .select('id, topic, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!roadmaps || roadmaps.length === 0) { setIsLoading(false); return; }

      // For each roadmap, compute progress from node_progress
      const skillCards = await Promise.all(roadmaps.map(async (roadmap) => {
        // Fetch node count and completed count in parallel
        const [nodesRes, progressRes] = await Promise.all([
          supabase.from('roadmap_nodes')
            .select('node_id', { count: 'exact' })
            .eq('roadmap_id', roadmap.id),
          supabase.from('node_progress')
            .select('node_id', { count: 'exact' })
            .eq('roadmap_id', roadmap.id)
            .eq('user_id', user.id)
            .eq('is_completed', true),
        ]);

        // Safely query study_sessions (table may not exist yet)
        let totalMinutes = 0;
        try {
          const sessionsRes = await supabase
            .from('study_sessions')
            .select('duration_minutes')
            .eq('roadmap_id', roadmap.id)
            .eq('user_id', user.id);
          if (sessionsRes.data) {
            totalMinutes = sessionsRes.data.reduce(
              (sum: number, s: any) => sum + (s.duration_minutes || 0), 0
            );
          }
        } catch (_) { /* study_sessions table may not exist yet */ }

        const totalNodes = nodesRes.count ?? 0;
        const completedNodes = progressRes.count ?? 0;
        const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
        const slug = roadmap.topic?.toLowerCase().replace(/\s+/g, '-') || roadmap.id;

        return {
          id: roadmap.id,
          title: roadmap.topic || 'Untitled Roadmap',
          category: `${completedNodes} / ${totalNodes} modules completed`,
          progress,
          status: (progress === 100 ? 'Done' : 'Ongoing') as SkillStatus,
          total_time_spent: totalMinutes,
          slug,
        };
      }));

      setSkills(skillCards);
      setIsLoading(false);
    };

    fetchProfileData();
  }, []);

  const displayedSkills = skills.filter(skill => skill.status === activeTab);
  const counts = {
    Ongoing: skills.filter(s => s.status === 'Ongoing').length,
    Done: skills.filter(s => s.status === 'Done').length,
    Cancelled: 0,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-7xl z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Sidebar />

          <section className="lg:col-span-3">
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-8">My Skills</h1>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-gray-200 mb-8">
              {(['Ongoing', 'Done', 'Cancelled'] as SkillStatus[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`pb-4 flex items-center gap-2 font-semibold transition-all relative ${isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-[#FFD700] text-gray-900' : 'bg-gray-100 text-gray-500'}`}>
                      {counts[tab]}
                    </span>
                    {isActive && (
                      <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-[#FFD700] rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <h2 className="font-display text-2xl font-bold text-gray-900 mt-12 mb-6">Course Path</h2>

            {/* Loading skeletons — show immediately, no layout shift */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-[24px] p-6 border border-gray-100 h-[260px] animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 mb-6" />
                    <div className="h-5 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-8" />
                    <div className="h-2.5 bg-gray-100 rounded-full w-full mb-4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <div key={activeTab} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayedSkills.length > 0 ? (
                    displayedSkills.map((skill, idx) => (
                      /* Each card animates in immediately using its own index delay — no stagger chain needed */
                      <motion.div
                        key={skill.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.35, delay: idx * 0.07, ease: 'easeOut' }}
                        whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        onClick={() => window.location.href = `/skill/${skill.slug}`}
                        className="bg-white rounded-[24px] p-6 shadow-sm hover:shadow-xl border border-gray-100 flex flex-col transition-shadow duration-300 group cursor-pointer h-[260px]"
                      >
                        <div className="flex justify-between items-start mb-5">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#FEF9C3] text-[#CA8A04] group-hover:scale-110 transition-transform">
                            <PlayCircle className="w-6 h-6" />
                          </div>
                          <button className="text-gray-400 hover:text-gray-600 p-1" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Topic title — e.g. "Next.js", "Python" */}
                        <h3 className="font-bold text-xl text-gray-900 mb-1 leading-tight capitalize">{skill.title}</h3>
                        <p className="text-sm text-gray-400 mb-4">{skill.category}</p>

                        <div className="mt-auto">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">Progress</span>
                            <span className="text-sm font-bold text-gray-900">{skill.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-5 overflow-hidden">
                            <motion.div
                              className={`h-2.5 rounded-full ${skill.progress === 100 ? 'bg-green-500' : 'bg-[#FFD700]'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${skill.progress}%` }}
                              transition={{ duration: 1, delay: idx * 0.07 + 0.3, ease: 'easeOut' }}
                            />
                          </div>
                          <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Clock className="w-4 h-4" />
                              {/* Shows 0 min until study_sessions table is created and populated */}
                              <span className="text-xs font-medium">{skill.total_time_spent} min</span>
                            </div>
                            <span className={`text-sm font-bold flex items-center gap-1 ${skill.status === 'Done' ? 'text-green-600' : 'text-[#CA8A04]'}`}>
                              {skill.status === 'Ongoing' && <PlayCircle className="w-4 h-4" />}
                              {skill.status === 'Ongoing' ? 'Continue' : 'Review'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="col-span-full py-12 text-center text-gray-500"
                    >
                      {activeTab === 'Ongoing' ? (
                        <>No ongoing skills yet. <a href="/roadmaps" className="text-[#CA8A04] font-bold hover:underline">Generate a roadmap</a> to start!</>
                      ) : `No ${activeTab.toLowerCase()} skills found.`}
                    </motion.div>
                  )}
                </div>
              </AnimatePresence>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}