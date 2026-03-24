'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, TrendingUp, List as ListIcon, ThumbsUp, ThumbsDown, Loader2, Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface CourseNode {
  id: string;
  roadmap_id: string;
  category: string;
  icon_type: string;
  upvotes: number; // legacy net score
  upvoteCount?: number;
  downvoteCount?: number;
  title: string;
  description: string;
  creator_avatar: string;
  creator_name: string;
  creator_role: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'database': return <Database className="w-5 h-5 text-gray-700" />;
    case 'trending-up': return <TrendingUp className="w-5 h-5 text-gray-700" />;
    case 'list': return <ListIcon className="w-5 h-5 text-gray-700" />;
    default: return <Database className="w-5 h-5 text-gray-700" />;
  }
};

export default function CommunityPage() {
  const [courses, setCourses] = useState<CourseNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResultsIdList, setSearchResultsIdList] = useState<string[] | null>(null);
  
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchUserAndCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data, error } = await supabase
        .from('community_roadmaps')
        .select('*')
        .order('upvotes', { ascending: false });

      // Fetch all votes to compute up/down metrics locally
      const { data: allVotes } = await supabase
        .from('community_roadmap_votes')
        .select('community_roadmap_id, vote_type')
        .limit(15000); // Temporary high limit for prototype scale

      const upMap: Record<string, number> = {};
      const downMap: Record<string, number> = {};
      if (allVotes) {
        allVotes.forEach(v => {
          if (v.vote_type === 1) upMap[v.community_roadmap_id] = (upMap[v.community_roadmap_id] || 0) + 1;
          if (v.vote_type === -1) downMap[v.community_roadmap_id] = (downMap[v.community_roadmap_id] || 0) + 1;
        });
      }

      if (data) {
        setCourses(data.map(c => ({
          ...c,
          upvoteCount: upMap[c.id] || 0,
          downvoteCount: downMap[c.id] || 0
        })));
      }

      if (user) {
        const { data: voteData } = await supabase
          .from('community_roadmap_votes')
          .select('community_roadmap_id, vote_type')
          .eq('user_id', user.id);
        
        if (voteData) {
          const votesMap: Record<string, number> = {};
          voteData.forEach(v => {
            votesMap[v.community_roadmap_id] = v.vote_type;
          });
          setUserVotes(votesMap);
        }
      }

      setLoading(false);
    };

    fetchUserAndCourses();
  }, [supabase]);

  const handleVote = async (id: string, type: 'up' | 'down') => {
    if (!user) {
      alert("Please log in to vote.");
      return;
    }

    const voteValue = type === 'up' ? 1 : -1;

    // Prevent duplicate voting of the same type
    if (userVotes[id] === voteValue) {
      return;
    }

    // Determine the net change in score
    const previousVote = userVotes[id] || 0;
    const scoreDiff = voteValue - previousVote;

    let upDelta = 0;
    let downDelta = 0;
    if (previousVote === 1) upDelta -= 1;
    if (previousVote === -1) downDelta -= 1;
    if (voteValue === 1) upDelta += 1;
    if (voteValue === -1) downDelta += 1;

    // Optimistic update
    setCourses(prev => prev.map(course => {
      if (course.id === id) {
        return { 
          ...course, 
          upvotes: course.upvotes + scoreDiff,
          upvoteCount: (course.upvoteCount || 0) + upDelta,
          downvoteCount: (course.downvoteCount || 0) + downDelta
        };
      }
      return course;
    }));
    setUserVotes(prev => ({ ...prev, [id]: voteValue }));

    // Record the vote using an upsert conceptually.
    // If we only have insert and no delete, we can try to delete previous ones first.
    if (previousVote !== 0) {
      await supabase
        .from('community_roadmap_votes')
        .delete()
        .eq('community_roadmap_id', id)
        .eq('user_id', user.id);
    }
    
    // Insert new vote
    const { error: insertError } = await supabase.from('community_roadmap_votes').insert({
      community_roadmap_id: id,
      user_id: user.id,
      vote_type: voteValue
    });

    if (insertError) {
      // Background revert
      setCourses(prev => prev.map(course => {
        if (course.id === id) {
          return { 
            ...course, 
            upvotes: course.upvotes - scoreDiff,
            upvoteCount: (course.upvoteCount || 0) - upDelta,
            downvoteCount: (course.downvoteCount || 0) - downDelta
          };
        }
        return course;
      }));
      setUserVotes(prev => ({ ...prev, [id]: previousVote }));
      alert("An error occurred while voting.");
      return;
    }

    // Update main counter
    const { data: currentData } = await supabase
      .from('community_roadmaps')
      .select('upvotes')
      .eq('id', id)
      .single();

    if (currentData) {
      await supabase
        .from('community_roadmaps')
        .update({ upvotes: currentData.upvotes + scoreDiff })
        .eq('id', id);
    }
  };

  const formatVotes = (votes: number) => {
    if (votes >= 1000) {
      return (votes / 1000).toFixed(1) + 'k';
    }
    return votes.toString();
  };

  const filteredCourses = useMemo(() => {
    if (searchResultsIdList === null) return courses;
    return courses.filter(c => searchResultsIdList.includes(c.id));
  }, [courses, searchResultsIdList]);

  const groupedCourses = useMemo(() => {
    const groups: Record<string, CourseNode[]> = {};
    filteredCourses.forEach(c => {
      const cat = c.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    });
    return groups;
  }, [filteredCourses]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResultsIdList(null);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await fetch('/api/community/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed })
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResultsIdList(data.ids || []);
      } else {
        setSearchResultsIdList(null);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResultsIdList(null);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResultsIdList(null);
  };

  const popNode = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 250, damping: 25 }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={!!user} />

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-5xl z-10 mx-auto">
          <section className="w-full mb-12 text-center pt-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3 text-center">Community Hub</h1>
            <p className="text-gray-500 font-medium pb-8 flex items-center justify-center gap-2">
              Discover and share the best learning paths
            </p>

            <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full pl-12 pr-28 py-4 rounded-full border-2 border-gray-100 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100/50 shadow-sm transition-all text-lg"
              />
              <div className="absolute inset-y-0 right-2 flex items-center gap-2">
                {searchQuery && (
                  <button type="button" onClick={clearSearch} className="text-sm font-medium text-gray-400 hover:text-gray-600 px-2 transition-colors">
                     Clear
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-[#FFD700] hover:bg-[#E6C200] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 px-6 rounded-full font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 h-10 w-28"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </button>
              </div>
            </form>
          </section>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-24">
               <p className="text-xl text-gray-400 font-medium">Currently there are no community roadmaps published.</p>
               <p className="text-gray-400 mt-2">Publish a roadmap to see it here!</p>
            </div>
          ) : Object.keys(groupedCourses).length === 0 && searchResultsIdList !== null ? (
              <div className="text-center py-24">
                 <p className="text-xl text-gray-400 font-medium">No roadmaps matched your search.</p>
                 <button onClick={clearSearch} className="text-yellow-600 hover:text-yellow-700 font-bold mt-4">
                   Clear search
                 </button>
              </div>
            ) : (
            Object.entries(groupedCourses).map(([category, catCourses]) => (
              <section key={category} className="w-full mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 whitespace-nowrap">{category}</h2>
                  <div className="h-[1px] bg-gray-200 w-full rounded-full"></div>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-8 pt-2 snap-x snap-mandatory px-1 -mx-1" style={{ scrollbarWidth: 'thin' }}>
                  <AnimatePresence>
                    {catCourses.map((course) => {
                      const userVote = userVotes[course.id] || 0;
                      return (
                      <motion.div
                        key={course.id}
                        layout
                        variants={popNode}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px 0px" }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        onClick={() => router.push(`/skill/${course.roadmap_id}/overview`)}
                        className="w-[85vw] sm:w-[340px] lg:w-[360px] shrink-0 snap-start bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-2xl hover:shadow-[#FFD700]/10 hover:border-[#FFD700] transition-all duration-300 group cursor-pointer relative z-10"
                      >
                        {/* Top Row: Icon and Votes */}
                        <div className="flex justify-between items-start mb-6 w-full">
                          <div className="w-12 h-12 bg-gray-50 rounded-full border border-gray-100 flex items-center justify-center transition-colors group-hover:bg-[#FFFDF6] group-hover:border-[#FFD700]/50 shrink-0">
                            {getIcon(course.icon_type)}
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-full py-1.5 px-3 border border-gray-100 transition-colors group-hover:bg-white group-hover:border-gray-200 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVote(course.id, 'up'); }}
                              className={`flex items-center gap-1.5 focus:outline-none transition-transform hover:scale-105 active:scale-95 ${
                                userVote === 1 ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'
                              }`}
                            >
                              <ThumbsUp className={`w-4 h-4 ${userVote === 1 ? 'fill-blue-500' : ''}`} />
                              <span className={`text-sm font-bold select-none ${userVote === 1 ? 'text-blue-600' : 'text-gray-600'}`}>
                                {formatVotes(course.upvoteCount || 0)}
                              </span>
                            </button>

                            <div className="w-[1px] h-4 bg-gray-200 leading-none"></div>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleVote(course.id, 'down'); }}
                              className={`flex items-center gap-1.5 focus:outline-none transition-transform hover:scale-105 active:scale-95 ${
                                userVote === -1 ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
                              }`}
                            >
                              <ThumbsDown className={`w-4 h-4 mt-0.5 ${userVote === -1 ? 'fill-orange-500' : ''}`} />
                              <span className={`text-xs font-bold select-none opacity-90 ${userVote === -1 ? 'text-orange-600' : 'text-gray-500'}`}>
                                {formatVotes(course.downvoteCount || 0)}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Middle Row: Title and Description */}
                        <div className="flex-grow mb-6 w-full">
                          <h3 className="font-bold text-xl text-gray-900 mb-2 leading-tight group-hover:text-[#A16207] transition-colors line-clamp-2">
                            {course.title}
                          </h3>
                          <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        {/* Bottom Row: Creator Profile */}
                        <div className="pt-4 border-t border-gray-100 flex items-center gap-3 w-full">
                          <img
                            src={course.creator_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(course.creator_name || 'User')}&background=FEF9C3&color=A16207&bold=true`}
                            alt={course.creator_name}
                            className="w-10 h-10 rounded-full border border-gray-100 object-cover shrink-0"
                          />
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-gray-900 leading-none mb-1 truncate">
                              {course.creator_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-400 leading-none truncate">
                              {course.creator_role || 'Member'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )))
          }


        </div>
      </main>
      <Footer />
    </div>
  );
}
