'use client';

import { use, useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark, Flag, Play, Volume2, Maximize2, ChevronLeft, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import BookmarkButton from '@/components/BookmarkButton';

export default function MaterialsPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id, moduleId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const pageLoadTime = useRef<Date>(new Date()); // track when user opened the page

  // Data State
  const [moduleTitle, setModuleTitle] = useState("Loading Topic...");
  const [microTopics, setMicroTopics] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const supabase = createClient();

        // Fetch Parent Topic Title
        const { data: nodeData } = await supabase
          .from('roadmap_nodes')
          .select('title')
          .eq('node_id', moduleId)
          .limit(1);

        if (nodeData && nodeData.length > 0) {
          setModuleTitle(nodeData[0].title);
        }

        // Fetch Micro Topics
        const { data: topicsData, error } = await supabase
          .from('micro_topics_contents')
          .select('*')
          .eq('macro_node_id', moduleId)
          .order('id', { ascending: true }); // Ensure consistent order

        if (topicsData && topicsData.length > 0) {
          // Parse stringified JSON content safely
          const parsedTopics = topicsData.map(topic => {
            try {
              return typeof topic.content === 'string' ? JSON.parse(topic.content) : topic.content;
            } catch (e) {
              console.error("Failed to parse micro-topic JSON", e);
              return null;
            }
          }).filter(Boolean); // Drop failed parses

          setMicroTopics(parsedTopics);
        }

      } catch (err) {
        console.error("Error fetching materials:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [moduleId]);

  // Writes node completion, study session, and badge checks to DB
  const handleFinish = async () => {
    setIsFinishing(true);
    const minutesSpent = Math.max(1, Math.round((new Date().getTime() - pageLoadTime.current.getTime()) / 60000));

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 1. Get roadmap_id for this module
        const { data: nodeData } = await supabase
          .from('roadmap_nodes')
          .select('roadmap_id')
          .eq('node_id', moduleId)
          .limit(1);

        if (nodeData && nodeData.length > 0) {
          const roadmapId = nodeData[0].roadmap_id;

          // 2. Upsert node progress
          await supabase.from('node_progress').upsert({
            user_id: user.id,
            roadmap_id: roadmapId,
            node_id: moduleId,
            is_completed: true,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,roadmap_id,node_id' });

          // 3. Record study session (gracefully skip if table doesn't exist)
          try {
            await supabase.from('study_sessions').insert({
              user_id: user.id,
              roadmap_id: roadmapId,
              node_id: moduleId,
              duration_minutes: minutesSpent,
              studied_at: new Date().toISOString(),
            });
          } catch (_) { /* study_sessions may not exist yet */ }

          // 4. Check and award badges (gracefully skip if tables don't exist)
          try {
            const today = new Date().toISOString().split('T')[0];

            // Count total completed nodes for this user
            const { count: totalCompleted } = await supabase
              .from('node_progress').select('node_id', { count: 'exact' })
              .eq('user_id', user.id).eq('is_completed', true);

            // Count completed nodes today
            const { count: todayCompleted } = await supabase
              .from('node_progress').select('node_id', { count: 'exact' })
              .eq('user_id', user.id).eq('is_completed', true)
              .gte('completed_at', `${today}T00:00:00`);

            // Check if this roadmap is fully complete
            const { count: roadmapTotal } = await supabase
              .from('roadmap_nodes').select('node_id', { count: 'exact' }).eq('roadmap_id', roadmapId);
            const { count: roadmapDone } = await supabase
              .from('node_progress').select('node_id', { count: 'exact' })
              .eq('roadmap_id', roadmapId).eq('user_id', user.id).eq('is_completed', true);

            const badgesToAward: string[] = [];
            if ((totalCompleted || 0) >= 1) badgesToAward.push('first_step');
            if ((totalCompleted || 0) >= 10) badgesToAward.push('bookworm');
            if ((todayCompleted || 0) >= 3) badgesToAward.push('on_a_roll');
            if (minutesSpent <= 30) badgesToAward.push('speed_learner');
            if (roadmapTotal && roadmapDone && roadmapDone >= roadmapTotal) badgesToAward.push('module_master');

            if (badgesToAward.length > 0) {
              await supabase.from('user_achievements').upsert(
                badgesToAward.map(badgeId => ({
                  user_id: user.id,
                  badge_id: badgeId,
                  earned_at: new Date().toISOString(),
                  is_seen: false,
                })),
                { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
              );
            }
          } catch (_) { /* badge tables may not exist yet */ }
        }
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    } finally {
      router.push(`/skill/${id}?highlight=${moduleId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  if (!loading && microTopics.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDF6] text-center p-4">
        <h2 className="text-2xl font-display font-bold mb-4">No Study Materials Found</h2>
        <p className="text-gray-500 mb-8 max-w-md">It looks like the AI generator has not completed synthesizing the micro-topics for this specific module yet. Please try generating a new roadmap.</p>
        <button onClick={() => router.push(`/skill/${id}`)} className="px-6 py-2 bg-[#FFD700] rounded-xl font-bold active:scale-95 shadow-sm">Return to Roadmap</button>
      </div>
    );
  }

  const currentTopic = microTopics[activeIndex];
  // Calculate aggregate topic time if available
  const totalModuleTime = microTopics.reduce((acc, curr) => acc + (curr.topic_total_time_minutes || 0), 0);
  const displayTime = totalModuleTime > 0 ? `${totalModuleTime} mins total` : 'Self-paced';

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-7xl mb-8 z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-2 capitalize">{moduleTitle}</h1>
              <div className="flex items-center gap-3 text-gray-600">
                <span className="bg-[#FEF3C7] text-[#B45309] text-xs font-bold px-2.5 py-1 rounded border border-[#FDE68A] uppercase tracking-wider">
                  Module View
                </span>
                <span className="text-sm">•</span>
                <span className="text-sm font-medium">{displayTime}</span>
              </div>
            </motion.div>
            <button
              onClick={() => router.push(`/skill/${id}`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm font-bold shadow-sm active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Roadmap
            </button>
          </div>
        </div>

        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
          <aside className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-28 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-display font-bold text-lg text-gray-900 mb-6">Topic Outline</h3>
              <div className="relative pl-2">
                <div className="absolute left-[11px] top-2 bottom-8 w-0.5 bg-gray-100" />
                {microTopics.map((item, idx) => {
                  const isActive = idx === activeIndex;
                  const isCompleted = idx < activeIndex; // Mocking passed topics as completed

                  return (
                    <div key={idx} onClick={() => setActiveIndex(idx)} className={`relative flex items-start mb-8 transition-opacity cursor-pointer transform hover:scale-[1.02] ${!isActive && !isCompleted ? 'opacity-60' : ''}`}>
                      {idx === 0 || idx === microTopics.length - 1 ? (
                        <div className="absolute -left-1 bg-[#FFFDF6] p-1 z-10">
                          <Flag className={`w-5 h-5 ${isCompleted || isActive ? 'text-[#EAB308] fill-current' : 'text-gray-300'}`} />
                        </div>
                      ) : (
                        <div className={`absolute left-[3px] top-1.5 w-4 h-4 rounded-full border-4 border-[#FFFDF6] shadow-sm z-10 ${isActive ? 'bg-[#FFD700] ring-4 ring-[#FEF9C3]' : 'bg-gray-300'}`} />
                      )}
                      <div className="ml-8">
                        <span className={`text-sm block leading-tight ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                          {item.topic_title || `Sub-topic ${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] inline-block mt-0.5">
                          {item.topic_total_time_minutes ? `${item.topic_total_time_minutes} min read` : 'Concept Study'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-6">
            <motion.div key={activeIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-gray-100 relative min-h-[500px]">
              <BookmarkButton
                roadmapId={id}
                moduleId={moduleId}
                type="materials"
                title={`${moduleTitle} - Materials`}
                className="absolute top-8 right-8 z-10"
              />

              <div className="mb-10 pr-12">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider 
                      ${currentTopic.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                      currentTopic.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                    {currentTopic.difficulty || 'neutral'}
                  </span>
                </div>
                <h2 className="font-display font-bold text-2xl text-gray-900 mb-6">{currentTopic.topic_title || "Conceptual Deep Dive"}</h2>

                {currentTopic.theory_explanation ? (
                  <div className="text-gray-700 leading-relaxed text-[17px] space-y-4">
                    {currentTopic.theory_explanation.split('\n').map((line: string, i: number) => {
                      if (!line.trim()) return null;
                      // Basic regex for **bold** and `code`
                      const formattedLine = line
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`([^`]+)`/g, '<code style="background-color: rgba(243, 244, 246, 0.5); color: #db2777; padding: 2px 6px; border-radius: 4px; font-size: 14px;">$1</code>')
                        .replace(/\*   /g, '• '); // basic bullet point conversion
                      return <p key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No theory explanation was generated for this topic.</p>
                )}
              </div>

              {currentTopic.resources && currentTopic.resources.length > 0 && (
                <div className="space-y-6 pt-6 border-t border-gray-50">
                  <h3 className="font-display font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-[#CA8A04]" />
                    Learning Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentTopic.resources.map((res: any, i: number) => (
                      <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-[#FAFAFA] hover:bg-white hover:shadow-md hover:border-[#FFD700] transition-all group">
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-[#FEF9C3] text-[#CA8A04] flex items-center justify-center">
                          {res.type === 'youtube' ? <Play className="w-6 h-6 ml-0.5" /> : <Bookmark className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 group-hover:text-[#CA8A04] transition-colors mb-1 line-clamp-2">{res.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <span className="capitalize">{res.type}</span>
                            {res.estimated_time_minutes && (
                              <>
                                <span>•</span>
                                <span>{res.estimated_time_minutes} mins</span>
                              </>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex justify-between items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <button
                onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                disabled={activeIndex === 0}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-30 disabled:hover:bg-transparent">
                <ChevronLeft className="w-5 h-5" /> Previous
              </button>
              <button
                onClick={() => {
                  if (activeIndex === microTopics.length - 1) {
                    handleFinish();
                  } else {
                    setActiveIndex(Math.min(microTopics.length - 1, activeIndex + 1));
                  }
                }}
                disabled={isFinishing}
                className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-wait ${activeIndex === microTopics.length - 1
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-[#FFD700] text-gray-900 hover:bg-[#E6C200]'
                  }`}>
                {activeIndex === microTopics.length - 1 ? (
                  isFinishing
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                    : <>Finish <CheckCircle className="w-5 h-5" /></>
                ) : (
                  <>Next Topic <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}