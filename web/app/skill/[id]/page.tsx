'use client';

import { use, useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { notFound, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { skillRoadmaps } from '@/lib/skill-details';
import {
  Users, Calendar, BookOpen, Layers,
  CheckSquare, FileText, Lock, Zap,
  ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import CalendarEventModal from '@/components/CalendarEventModal';

export interface SkillModule {
  id: string;
  title: string;
  description: string;
  isLocked: boolean;
  isCompleted: boolean;
  level: number;
}

export interface DetailedRoadmap {
  id: string;
  title: string;
  userCount: string;
  modules: SkillModule[];
}

export default function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [data, setData] = useState<DetailedRoadmap | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [highlightedModuleId, setHighlightedModuleId] = useState<string | null>(null);
  const [calendarModule, setCalendarModule] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

          let roadmapIdTemp = null;
          let pageTitleTemp = null;

          // 1. Try to find the exact NODE first (since clicking a graph node routes to /skill/node_slug)
          const { data: nodeData, error: nodeError } = await supabase
            .from('roadmap_nodes')
            .select('roadmap_id, title')
            .eq('node_id', id)
            .limit(1);

          if (nodeData && nodeData.length > 0) {
            roadmapIdTemp = nodeData[0].roadmap_id;
            pageTitleTemp = nodeData[0].title;
          } else {
            // 2. Fallback: Try to find the ROADMAP (if user manually typed /skill/NextJS)
            let query = supabase
              .from('roadmaps')
              .select('id, topic')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (isUUID) query = query.eq('id', id);
            else query = query.ilike('topic', `%${id.replace(/-/g, ' ')}%`);

            const { data: roadmaps } = await query;
            if (roadmaps && roadmaps.length > 0) {
              roadmapIdTemp = roadmaps[0].id;
              pageTitleTemp = roadmaps[0].topic;
            }
          }

          // 3. Fetch all modules, progress and edges for the resolved Roadmap ID
          if (roadmapIdTemp) {
            const [nodesRes, progressRes, edgesRes] = await Promise.all([
              supabase.from('roadmap_nodes').select('*').eq('roadmap_id', roadmapIdTemp).order('depth_level', { ascending: true }),
              supabase.from('node_progress').select('node_id').eq('user_id', user.id).eq('roadmap_id', roadmapIdTemp).eq('is_completed', true),
              supabase.from('roadmap_edges').select('source_node_id, target_node_id').eq('roadmap_id', roadmapIdTemp),
            ]);

            const nodes = nodesRes.data;
            const completedNodeIds = new Set((progressRes.data || []).map((p: any) => p.node_id));
            const edges = edgesRes.data || [];

            // Build prerequisite map: nodeId -> [prerequisite node_ids]
            const prereqMap = new Map<string, string[]>();
            edges.forEach((e: any) => {
              if (!prereqMap.has(e.target_node_id)) prereqMap.set(e.target_node_id, []);
              prereqMap.get(e.target_node_id)!.push(e.source_node_id);
            });

            if (nodes && nodes.length > 0) {
              const mappedModules: SkillModule[] = nodes.map((n) => {
                const isCompleted = completedNodeIds.has(n.node_id);
                // A node is unlocked if it has no prerequisites OR all prerequisites are completed
                const prereqs = prereqMap.get(n.node_id) || [];
                const isLocked = prereqs.length > 0 && !prereqs.every(pid => completedNodeIds.has(pid));

                return {
                  id: n.node_id,
                  title: n.title,
                  description: n.rationale || "Learn the concepts to master this module.",
                  isLocked: isLocked,
                  isCompleted: isCompleted,
                  level: n.depth_level,
                };
              });

              setData({
                id: roadmapIdTemp,
                title: pageTitleTemp || "Skill Overview",
                userCount: "",
                modules: mappedModules
              });
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching roadmap for detail page:", err);
      }

      // Fallback to static mock data if DB fetch fails or user is mock
      const fallback = skillRoadmaps[id] || skillRoadmaps['tech-python'];
      if (fallback) {
        const ms = fallback.modules.map(m => ({
          ...m,
          isCompleted: m.level === 1 && m.id === fallback.modules[0].id // static mock completion
        }));
        setData({
          id: fallback.id,
          title: fallback.title,
          userCount: fallback.userCount,
          modules: ms
        });
      } else {
        setData(null);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  // When data loads and we have a highlight param, jump to the right level
  useEffect(() => {
    if (!data || !highlightId) return;
    const targetModule = data.modules.find(m => m.id === highlightId);
    if (targetModule) {
      setCurrentLevel(targetModule.level);
      setHighlightedModuleId(highlightId);
      // Scroll to the highlighted card after a short delay to allow level change to render
      setTimeout(() => {
        const el = document.getElementById(`module-${highlightId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [data, highlightId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  if (!data) return notFound();

  const levels = Array.from(new Set(data.modules.map(m => m.level))).sort((a, b) => a - b);
  const minLevel = levels[0] || 1;
  const maxLevel = levels[levels.length - 1] || 1;
  const currentLevelModules = data.modules.filter(m => m.level === currentLevel);

  // Dynamic Level Progress Calculator
  const totalModulesInLevel = currentLevelModules.length;
  const completedModulesInLevel = currentLevelModules.filter(m => m.isCompleted).length;
  const currentLevelProgressPercent = totalModulesInLevel === 0 ? 0 : Math.round((completedModulesInLevel / totalModulesInLevel) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative overflow-hidden flex flex-col items-center py-12">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        {/* Header Section */}
        <div className="text-center z-10 mb-12 max-w-2xl px-4">
          <motion.h1
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-2 capitalize"
          >
            {data.title}
          </motion.h1>
        </div>

        {/* Dynamic Level Progress Bar Tracker */}
        <div className="w-full max-w-3xl px-4 z-10 mb-10 relative">
          <div className="bg-white rounded-3xl p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-gray-100 relative overflow-hidden">
            <h3 className="text-center text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Level {currentLevel} Progress</h3>
            <div className="relative h-6 bg-gray-100 rounded-full shadow-inner w-full flex items-center overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${currentLevelProgressPercent}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-primary z-10"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)' }}
              />

              {/* Sparkle Icon follows the progress edge */}
              <motion.div
                initial={{ left: 0 }} animate={{ left: `${currentLevelProgressPercent}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 shadow-sm bg-white rounded-full p-1"
              >
                <motion.div animate={{ y: [0, -2, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Zap className="w-6 h-6 text-orange-500 fill-orange-500 filter drop-shadow-md" />
                </motion.div>
              </motion.div>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs font-bold text-gray-400 px-2">
              <span>0%</span>
              <span className="text-gray-900 text-sm">{completedModulesInLevel} / {totalModulesInLevel} Completed</span>
              <span>100%</span>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <span className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              LEVEL {currentLevel} • {currentLevelProgressPercent}% COMPLETE
            </span>
          </div>
        </div>

        {/* Modules List by Level */}
        <div className="w-full max-w-4xl px-4 z-10">

          {/* Level Pagination Header */}
          <div className="flex items-center justify-center gap-8 mb-8">
            <button
              onClick={() => setCurrentLevel((l: number) => Math.max(minLevel, l - 1))}
              disabled={currentLevel <= minLevel}
              className="p-2 rounded-full hover:bg-yellow-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-10 h-10 text-gray-700" strokeWidth={2} />
            </button>
            <h2 className="text-4xl font-display font-bold text-gray-900 w-24 text-center">L{currentLevel}</h2>
            <button
              onClick={() => setCurrentLevel((l: number) => Math.min(maxLevel, l + 1))}
              disabled={currentLevel >= maxLevel}
              className="p-2 rounded-full hover:bg-yellow-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-10 h-10 text-gray-700" strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-6">
            {currentLevelModules.map((module, idx) => (
              <motion.div
                key={`${currentLevel}-${module.id}`}
                id={`module-${module.id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={!module.isLocked ? { scale: 1.01, y: -2 } : {}}
                className={`bg-white rounded-2xl p-6 border-2 transition-all group relative 
                  ${module.isLocked
                    ? 'opacity-60 grayscale cursor-not-allowed border-gray-200'
                    : module.id === highlightedModuleId
                      ? 'border-yellow-400 shadow-xl shadow-yellow-200/70 ring-4 ring-yellow-300/60'
                      : 'border-yellow-400/60 hover:border-yellow-400 hover:shadow-xl hover:shadow-yellow-100/50'}`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className={`font-display font-bold text-xl ${module.isLocked ? 'text-gray-500' : 'text-gray-900 group-hover:text-yellow-600 transition-colors'}`}>
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                  </div>
                  {!module.isLocked ? (
                    module.isCompleted ? (
                      <div className="text-green-500 font-bold text-sm bg-green-50 px-3 py-1 items-center flex rounded-full border border-green-200">
                        <CheckSquare className="w-4 h-4 mr-1" />
                        Done
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCalendarModule({ id: module.id, title: module.title }); }}
                        className="text-gray-300 hover:text-yellow-500 transition-colors"
                        title="Schedule study session">
                        <Calendar className="w-6 h-6" />
                      </button>
                    )
                  ) : (
                    <Lock className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Dynamic Action Grid */}
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-50 ${module.isLocked ? 'pointer-events-none' : ''}`}>
                  <ToolButton
                    icon={BookOpen}
                    label="Materials"
                    href={`/skill/${id}/${module.id}/materials`}
                  />
                  <ToolButton
                    icon={Layers}
                    label="Flashcards"
                    href={`/skill/${id}/${module.id}/flashcards`}
                  />
                  <ToolButton
                    icon={CheckSquare}
                    label="Quiz"
                    href={`/skill/${id}/${module.id}/quiz`}
                  />
                  <ToolButton
                    icon={FileText}
                    label="Summary"
                    href={`/skill/${id}/${module.id}/summary`}
                  />
                </div>
              </motion.div>
            ))}

            {currentLevelModules.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No modules found for this level.
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Calendar Event Modal */}
      {calendarModule && (
        <CalendarEventModal
          title={calendarModule.title}
          onClose={() => setCalendarModule(null)}
          onSaved={() => setCalendarModule(null)}
        />
      )}
    </div>
  );
}

// Sub-component for the module buttons using Next.js Link
function ToolButton({ icon: Icon, label, href }: { icon: any, label: string, href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-yellow-400/50 rounded-xl text-gray-700 font-bold text-xs hover:bg-yellow-50 hover:border-yellow-400 transition-all active:scale-95"
    >
      <Icon className="w-4 h-4 text-yellow-600" />
      {label}
    </Link>
  );
}
