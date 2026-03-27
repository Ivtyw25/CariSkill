'use client';

import { use, useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getSkillTrack, SkillTrack } from '@/lib/roadmap-data';
import { notFound, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Lock, Play, Rocket, Hand, Clock, Quote,
  Footprints, Trophy, Loader2, Share2, Check
} from 'lucide-react';
import DiscussionRoom from '@/components/DiscussionRoom';
import SkillLanguageSelector from '@/components/SkillLanguageSelector';
import { useSkillLanguage } from '@/components/SkillLanguageProvider';

const isUUIDString = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

export default function SkillOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [data, setData] = useState<SkillTrack | null>(null);
  const [localizedData, setLocalizedData] = useState<SkillTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { currentLanguage, translateText } = useSkillLanguage();
  
  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  
  // Community Navigation state
  const [isCommunityRoadmap, setIsCommunityRoadmap] = useState(false);
  const [isForking, setIsForking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      let stringifiedRoadmap = localStorage.getItem(`roadmap_${id}`);
      let dbResolvedTopic = "";

      // Try fetching from Supabase
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) setUser(authUser);

        const isUUID = isUUIDString(id);

        if (isUUID) {
          // 1. Check if it's in community_roadmaps (anyone can see this)
          const { data: pubData } = await supabase
            .from('community_roadmaps')
            .select('roadmap_id, creator_id, title')
            .eq('roadmap_id', id)
            .limit(1);
          
          if (pubData && pubData.length > 0) {
            setIsPublished(true);
            dbResolvedTopic = pubData[0].title || dbResolvedTopic;
            // If user is logged in and not the owner, it's a community roadmap for them
            if (authUser && pubData[0].creator_id !== authUser.id) {
              setIsCommunityRoadmap(true);
            }
            // If logged out, it's also treated as community roadmap (visible discussion)
            if (!authUser) {
              setIsCommunityRoadmap(true);
            }
          }

          // 2. Fetch the actual content
          // If logged in, prioritize 'roadmaps' (maybe user's own version with progress notes later?)
          if (authUser) {
            const { data: ownRoadmaps } = await supabase
              .from('roadmaps')
              .select('id, topic, content')
              .eq('user_id', authUser.id)
              .eq('id', id)
              .limit(1);

            if (ownRoadmaps && ownRoadmaps.length > 0) {
              dbResolvedTopic = ownRoadmaps[0].topic || "";
              stringifiedRoadmap = typeof ownRoadmaps[0].content === 'string'
                ? ownRoadmaps[0].content
                : JSON.stringify(ownRoadmaps[0].content);
              
              // If it's the owner's roadmap, check if they have already saved it from community
              // (Wait, owners don't "save" their own, but if they saved someone else's...)
              // We already set isCommunityRoadmap above if they are NOT the creator.
            }
          }

          // 3. Fallback to public API if not found in user's own roadmaps
          if (!stringifiedRoadmap) {
            try {
              const publicRes = await fetch(`/api/community/roadmap/${id}`, { credentials: 'include' });
              if (publicRes.ok) {
                const publicData = await publicRes.json();
                dbResolvedTopic = publicData.topic || "";
                stringifiedRoadmap = typeof publicData.content === 'string'
                  ? publicData.content
                  : JSON.stringify(publicData.content);
                
                // If it's a community roadmap and we still don't have isCommunityRoadmap set
                if (authUser && publicData.user_id !== authUser.id) {
                    setIsCommunityRoadmap(true);
                } else if (!authUser) {
                    setIsCommunityRoadmap(true);
                }
              }
            } catch (e) {
              console.error("Public fetch failed", e);
            }
          }

          // 4. Check "Saved" status if it's a community roadmap
          if (authUser && (isCommunityRoadmap || (dbResolvedTopic && !stringifiedRoadmap))) {
            try {
               const savedRes = await fetch(`/api/community/saved-roadmaps`, { credentials: 'include' });
               if (savedRes.ok) {
                 const { roadmaps: savedList } = await savedRes.json();
                 const alreadySaved = (savedList || []).some((r: any) => r.id === id);
                 setIsSaved(alreadySaved);
               }
             } catch {}
          }
        } else {
          // Not a UUID - search by topic in user's own roadmaps
          if (authUser) {
            const { data: roadmaps } = await supabase
              .from('roadmaps')
              .select('id, topic, content')
              .eq('user_id', authUser.id)
              .ilike('topic', `%${id.replace(/-/g, ' ')}%`)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (roadmaps && roadmaps.length > 0) {
              dbResolvedTopic = roadmaps[0].topic || "";
              stringifiedRoadmap = typeof roadmaps[0].content === 'string'
                ? roadmaps[0].content
                : JSON.stringify(roadmaps[0].content);
            }
          }
        }
      } catch (err) {
        console.error("Supabase fetch error:", err);
      }

      if (stringifiedRoadmap && stringifiedRoadmap !== "undefined") {
        try {
          const parsed = typeof stringifiedRoadmap === 'string'
            ? JSON.parse(stringifiedRoadmap)
            : stringifiedRoadmap;

          // Safely parse the Payload which might hallucinate different array structures
          let learningPathData: any[] = [];
          if (Array.isArray(parsed)) {
            learningPathData = parsed;
          } else if (parsed?.phases && Array.isArray(parsed.phases)) {
            learningPathData = parsed.phases;
          } else if (parsed?.roadmap?.phases && Array.isArray(parsed.roadmap.phases)) {
            learningPathData = parsed.roadmap.phases;
          } else if (parsed?.learning_path && Array.isArray(parsed.learning_path)) {
            learningPathData = parsed.learning_path;
          } else if (parsed?.roadmap?.learning_path && Array.isArray(parsed.roadmap.learning_path)) {
            learningPathData = parsed.roadmap.learning_path;
          } else if (parsed?.modules && Array.isArray(parsed.modules)) {
            learningPathData = parsed.modules;
          } else if (parsed && typeof parsed.error_unparsed_raw_text === 'string') {
            // Handle the specific database fallback case where the LLM generated raw conversation
            learningPathData = [{
              title: "AI Generation Formatting Alert",
              description: "The AI produced an unformatted response: " + parsed.error_unparsed_raw_text.substring(0, 300) + "..."
            }];
          }

          // Ultimate Catch-All: Recursively find the first available array in the object!
          if (learningPathData.length === 0 && parsed && typeof parsed === 'object') {
            const findFirstArray = (obj: any): any[] | null => {
              if (!obj || typeof obj !== 'object') return null;
              for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
                if (typeof obj[key] === 'object') {
                  const nested = findFirstArray(obj[key]);
                  if (nested) return nested;
                }
              }
              return null;
            };
            const found = findFirstArray(parsed);
            if (found) learningPathData = found;
          }

          // Calculate a readable estimated time from minutes if available
          let readableTime = "Adaptive";
          if (parsed?.estimatedTimeMinutes && typeof parsed.estimatedTimeMinutes === 'number') {
            const mins = parsed.estimatedTimeMinutes;
            if (mins > 0) {
              const hours = Math.floor(mins / 60);
              const remMins = mins % 60;
              if (hours > 0 && remMins > 0) readableTime = `${hours}h ${remMins}m`;
              else if (hours > 0) readableTime = `${hours}h`;
              else readableTime = `${remMins}m`;
            }
          }

          // Transform CrewAI JSON format to standard frontend SkillTrack format
          const transformedData: SkillTrack = {
            id: id,
            title: dbResolvedTopic || parsed?.topic || id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            tagline: parsed?.description || parsed?.roadmap?.description || "Your AI-Generated Learning Path",
            progress: 0,
            estimatedTime: readableTime,
            welcomeMessage: "Welcome! Your specialized AI roadmap has been forged.",
            quote: { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
            modules: learningPathData.map((step: any, idx: number) => ({
              id: step?.node_id || step?.id || `m${idx + 1}`,
              title: step?.title || step?.skill || `Phase ${idx + 1}`,
              description: step?.rationale || step?.obj || step?.description || step?.content || "Learn the concepts to master this step.",
              duration: step?.duration,
              obj: step?.obj,
              items: step?.suggested_micro_topics || step?.items || [],
              status: idx === 0 ? 'current' : 'locked' // First module is current, rest locked
            }))
          };
          setData(transformedData);
          setLoading(false);
          return;
        } catch (e) {
          console.error("Failed to parse saved roadmap", e);
        }
      }

      // Fallback to static data if not found in localStorage or Supabase
      const fallbackData = getSkillTrack(id);
      if (fallbackData) {
        if (dbResolvedTopic) {
          fallbackData.title = dbResolvedTopic;
          fallbackData.tagline = `Your personalized path to mastering ${dbResolvedTopic}.`;
          fallbackData.welcomeMessage = `Welcome to your custom ${dbResolvedTopic} roadmap! We've tailored these steps based on your goals.`;
        }
        setData(fallbackData);
        setLoading(false);
      } else {
        setLoading(false); // will trigger notFound
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    const localize = async () => {
      if (!data) return;
      if (currentLanguage === 'en') {
        setLocalizedData(data);
        return;
      }

      setLoading(true);
      try {
        const tTitle = await translateText(data.title, currentLanguage);
        const tTagline = await translateText(data.tagline, currentLanguage);
        const tModules = await Promise.all(
          data.modules.map(async m => {
            const mTitle = await translateText(m.title, currentLanguage);
            const mDesc = await translateText(m.description, currentLanguage);
            // Translate subtopic items (bullets)
            const mItems = m.items && m.items.length > 0
              ? await translateText(m.items, currentLanguage)
              : [];
            
            return { ...m, title: mTitle, description: mDesc, items: Array.isArray(mItems) ? mItems : [mItems] };
          })
        );
        setLocalizedData({ ...data, title: tTitle, tagline: tTagline, modules: tModules });
      } catch (e) {
        console.error("Overview Translation Error:", e);
        setLocalizedData(data);
      } finally {
        setLoading(false);
      }
    };
    localize();
  }, [data, currentLanguage]);

  const handlePublish = async () => {
    if (!user || !data) return;
    if (!isUUIDString(id)) {
      alert("Only personalized AI roadmaps can be published.");
      return;
    }
    
    setIsPublishing(true);
    
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      // Check if all modules have been 100% completed by the user
      const moduleIds = data.modules.map(m => m.id);
      
      const { data: progressNodes } = await supabase
        .from('node_progress')
        .select('node_id')
        .eq('roadmap_id', id)
        .eq('user_id', user.id)
        .eq('is_completed', true);
        
      const completedSet = new Set(progressNodes?.map(p => p.node_id) || []);
      const is100PercentCompleted = moduleIds.every(mid => completedSet.has(mid));
      
      if (!is100PercentCompleted) {
        alert("You must 100% complete all modules in this roadmap before you can publish it to the community. Please finish learning all topics first to ensure all content is fully generated for others!");
        setIsPublishing(false);
        return;
      }

      // Auto-categorize via Gemini API
      let category = 'Uncategorized';
      let iconType = 'database';
      
      try {
        const catRes = await fetch('/api/community/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title, description: data.tagline })
        });
        
        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.category) category = catData.category;
          if (catData.icon_type) iconType = catData.icon_type;
        }
      } catch (catErr) {
        console.error("Categorization failed, falling back to defaults", catErr);
      }
      
      const { error } = await supabase.from('community_roadmaps').insert({
        roadmap_id: id,
        title: data.title,
        description: data.tagline,
        category: category, 
        icon_type: iconType, 
        creator_id: user.id,
        creator_name: user.user_metadata?.full_name || 'Anonymous',
        creator_avatar: user.user_metadata?.avatar_url || '',
        creator_role: 'Contributor'
      });

      if (error) {
        console.error("Error publishing roadmap:", error);
        alert("Failed to publish. Please try again.");
      } else {
        setIsPublished(true);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to publish.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleStartLearning = async () => {
    if (isCommunityRoadmap) {
      setIsForking(true);
      try {
        const res = await fetch('/api/community/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roadmap_id: id })
        });
        
        if (res.ok) {
          const data = await res.json();
          setIsSaved(true);
          setIsForking(false);
          // Navigate to the skill page to start learning
          router.push(`/skill/${data.roadmap_id}`);
        } else {
          alert("Failed to save to your roadmaps.");
          setIsForking(false);
        }
      } catch (e) {
        console.error("Save failed:", e);
        alert("An error occurred while saving the roadmap.");
        setIsForking(false);
      }
    } else {
      router.push(`/skill/${id}`);
    }
  };

  // Scroll Entrance Animation (Matched to Progress Page)
  const popNode = {
    hidden: { opacity: 0, scale: 0.6, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 250, damping: 20 }
    }
  };

  // Breathing Glow Animation (Matched to Progress Page)
  const breathingGlow = {
    animate: {
      boxShadow: [
        "0px 0px 0px 0px rgba(255, 215, 0, 0.2)",
        "0px 0px 20px 8px rgba(255, 215, 0, 0.5)",
        "0px 0px 0px 0px rgba(255, 215, 0, 0.2)"
      ]
    },
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const }
  };

  if (loading || (data && !localizedData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  if (!data || !localizedData) return notFound();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900 overflow-x-hidden">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col items-center py-8 px-4">
        {/* Background Radial Dots */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-40 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        {/* Header Section */}
        <div className="absolute top-8 right-8 z-20">
           <SkillLanguageSelector />
        </div>

        <div className="w-full max-w-5xl mb-16 flex flex-col md:flex-row items-center justify-between gap-8 z-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-bold mb-4 border border-yellow-200">
              <Trophy className="w-4 h-4" /> Skill Track
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-2 leading-tight">
              {localizedData.title}
            </h1>
            <p className="text-gray-600 text-lg">{localizedData.tagline}</p>
          </motion.div>

          {/* Progress Ring (Static 0%) */}
          <div className="relative w-32 h-32 flex items-center justify-center group">
            <svg className="w-32 h-32 -rotate-90" height="128" width="128">
              <circle className="text-gray-200" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8" />
              <circle
                className="text-gray-300" cx="64" cy="64" fill="transparent" r="58"
                stroke="currentColor" strokeLinecap="round" strokeWidth="8"
                strokeDasharray="364.425" strokeDashoffset="364.425"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 font-display">0%</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Complete</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-6xl relative min-h-[1000px] flex flex-col md:flex-row gap-12">

          {/* Vertical Roadmap Column */}
          <div className="flex-grow relative flex flex-col items-center md:items-start py-10 w-full">

            {/* THE YELLOW TRUNK LINE */}
            <div className="absolute top-0 bottom-0 left-1/2 md:left-[168px] -translate-x-1/2 w-1 bg-yellow-100 z-0">
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeInOut" as const }}
                className="absolute top-0 left-0 right-0 bg-[#FFD700] origin-top opacity-50"
                style={{ height: '100%' }}
              />
            </div>

            {/* Start Node with Breathing Glow */}
            <div className="relative z-10 flex items-center justify-center mb-24 md:ml-[120px] w-24">
              <motion.div
                variants={popNode}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative"
              >
                {/* Glow Effect */}
                <motion.div
                  animate={breathingGlow.animate}
                  transition={breathingGlow.transition}
                  className="absolute inset-0 rounded-full bg-yellow-400/30"
                />

                <div className="relative w-24 h-24 rounded-full bg-gray-900 border-4 border-[#FFD700] shadow-2xl flex items-center justify-center z-10">
                  <Footprints className="text-white w-8 h-8 animate-bounce" />
                </div>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#FFD700] text-gray-900 text-[10px] font-black py-1 px-3 rounded-full shadow-lg border border-white z-20 uppercase tracking-wider whitespace-nowrap">
                  Start Here
                </div>
              </motion.div>
            </div>

            {/* Module List with Scroll Animation */}
            <div className="flex flex-col items-center md:items-start w-full gap-20">
              {localizedData.modules.map((module) => (
                <motion.div
// ... (rest of map content uses 'module' which is fine)

                  key={module.id}
                  variants={popNode}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-10% 0px" }}
                  className="relative z-10 flex flex-col md:flex-row items-center gap-6 w-full md:w-[calc(100%-120px)] md:ml-[120px] md:pr-4"
                >
                  {/* Yellow Glowing Node */}
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-yellow-200 shadow-sm flex items-center justify-center z-20 relative transition-transform hover:scale-105">
                      <Lock className="w-8 h-8 text-yellow-500/50" />
                    </div>
                  </div>

                  {/* Module Card */}
                  <div className="bg-white/80 p-6 rounded-3xl border border-yellow-100 shadow-sm text-center md:text-left flex-1 min-w-[250px] w-full max-w-lg backdrop-blur-md hover:border-[#FFD700] transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900 font-display text-xl group-hover:text-yellow-600 transition-colors">
                        {module.title}
                      </h3>
                      {module.duration && (
                        <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {module.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {module.description}
                    </p>

                    {/* Check if items array exists and has content */}
                    {module.items && module.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-yellow-100/50">
                        <ul className="text-sm text-gray-500 space-y-2 text-left">
                          {module.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-yellow-500 mt-0.5">•</span>
                              <span className="leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="w-full md:w-[400px] flex-shrink-0 relative">
            <div className="sticky top-28 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden"
              >
                <div className="bg-gray-900 p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Rocket className="w-32 h-32 text-white rotate-12" />
                  </div>
                  <h2 className="text-white font-display text-3xl font-bold mb-1 relative z-10">Start Your Journey</h2>
                  <p className="text-gray-400 relative z-10">Welcome to {localizedData.title}</p>
                </div>
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center flex-shrink-0 text-[#CA8A04]">
                      <Hand className="w-6 h-6 -rotate-12" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">Ready to begin?</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Your roadmap is ready. Start your first lesson to unlock the path and track your progress.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleStartLearning}
                    disabled={isForking}
                    className="w-full font-bold text-lg py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-[#FFD700]/50 disabled:cursor-not-allowed text-gray-900"
                  >
                    {isForking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    )}
                    {isForking ? "Saving..." : (isCommunityRoadmap && !isSaved) ? "Save & Start Learning" : "Start Learning"}
                  </button>
                  
                  {isUUIDString(id) && !isCommunityRoadmap && (
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing || isPublished}
                      className={`w-full mt-4 border-2 font-bold text-base py-3 rounded-xl transition-all flex items-center justify-center gap-2 group ${
                        isPublished 
                          ? "bg-green-50 border-green-200 text-green-700 cursor-default" 
                          : "bg-white border-gray-200 hover:border-gray-300 text-gray-700 active:scale-95"
                      }`}
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Publishing...
                        </>
                      ) : isPublished ? (
                        <>
                          <Check className="w-4 h-4" />
                          Published to Community
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          Publish to Community
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Estimated Time</span>
                  <span className="font-bold text-gray-700 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {data.estimatedTime}
                  </span>
                </div>
              </motion.div>

              {/* Discussion Room — shown for community/published roadmaps only */}
              {(isCommunityRoadmap || isPublished) && isUUIDString(id) && (
                <DiscussionRoom roadmapId={id} />
              )}
            </div>
          </div>



        </div>
      </main>
      <Footer />
    </div>
  );
}