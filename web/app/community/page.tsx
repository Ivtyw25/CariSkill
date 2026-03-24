'use client';

import { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, TrendingUp, List as ListIcon, ChevronUp, ChevronDown, Loader2, Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface CourseNode {
  id: string;
  roadmap_id: string;
  category: string;
  icon_type: string;
  upvotes: number;
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

  useEffect(() => {
    const fetchUserAndCourses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data, error } = await supabase
        .from('community_roadmaps')
        .select('*')
        .order('upvotes', { ascending: false });

      if (data) {
        setCourses(data);
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

    // Optimistic update
    setCourses(prev => prev.map(course => {
      if (course.id === id) {
        return { ...course, upvotes: course.upvotes + voteValue };
      }
      return course;
    }));

    // Record the vote
    const { error: insertError } = await supabase.from('community_roadmap_votes').insert({
      community_roadmap_id: id,
      user_id: user.id,
      vote_type: voteValue
    });

    if (insertError) {
      // Revert if vote fails (e.g., unique constraint violation meaning they already voted)
      alert("You have already voted on this roadmap or an error occurred.");
      setCourses(prev => prev.map(course => {
        if (course.id === id) {
          return { ...course, upvotes: course.upvotes - voteValue };
        }
        return course;
      }));
      return;
    }

    // Update main counter
    // For a highly concurrent app, use an RPC for atomic increment. 
    // Here we use a standard select + update since we lack an RPC currently.
    const { data: currentData } = await supabase
      .from('community_roadmaps')
      .select('upvotes')
      .eq('id', id)
      .single();

    if (currentData) {
      await supabase
        .from('community_roadmaps')
        .update({ upvotes: currentData.upvotes + voteValue })
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {catCourses.map((course) => (
                      <motion.div
                        key={course.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => router.push(`/skill/${course.roadmap_id}/overview`)}
                        className="bg-white rounded-[24px] p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col hover:shadow-xl hover:border-[#FFD700]/60 transition-all duration-300 group cursor-pointer"
                      >
                        {/* Top Row: Icon and Votes */}
                        <div className="flex justify-between items-start mb-6 w-full">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center transition-colors group-hover:bg-[#FEF9C3] shrink-0">
                            {getIcon(course.icon_type)}
                          </div>
                          <div className="flex flex-col items-center bg-gray-50 rounded-[20px] py-1.5 px-3 min-w-[50px] shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVote(course.id, 'up'); }}
                              className="text-gray-400 hover:text-gray-900 focus:outline-none transition-colors py-0.5"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-gray-900 my-0.5 select-none text-center">
                              {formatVotes(course.upvotes)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVote(course.id, 'down'); }}
                              className="text-gray-400 hover:text-gray-900 focus:outline-none transition-colors py-0.5"
                            >
                              <ChevronDown className="w-4 h-4" />
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
                    ))}
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
