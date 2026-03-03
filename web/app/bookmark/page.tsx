'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, PlayCircle, Loader2, BookOpen, Layers, CheckCircle } from 'lucide-react';

interface BookmarkItem {
  id: string;
  roadmap_id: string;
  node_id: string;
  type: 'materials' | 'flashcards' | 'quiz' | 'summary';
  title: string;
  url: string;
  created_at: string;
}

export default function BookmarksPage() {
  const supabase = createClient();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setBookmarks(data);
      setLoading(false);
    };
    fetchBookmarks();
  }, []);

  const removeBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (!error) {
      setBookmarks(prev => prev.filter(b => b.id !== id));
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'materials': return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'flashcards': return <Layers className="w-5 h-5 text-purple-600" />;
      case 'quiz': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'summary': return <Bookmark className="w-5 h-5 text-orange-600" />;
      default: return <Bookmark className="w-5 h-5 text-gray-600" />;
    }
  };

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'materials': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'flashcards': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'quiz': return 'bg-green-100 text-green-700 border-green-200';
      case 'summary': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-4xl z-10 mx-auto">
          <section className="w-full">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3 text-center">Saved Bookmarks</h1>
            <p className="text-gray-500 font-medium mb-10 flex items-center justify-center gap-2">
              <Bookmark className="w-5 h-5 text-[#CA8A04] fill-current" />
              Your curated list of learning materials
            </p>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                  {bookmarks.length > 0 ? (
                    bookmarks.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                        onClick={() => window.location.href = item.url}
                        className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl border border-gray-100 hover:border-[#FFD700]/60 flex items-center justify-between transition-all duration-300 group cursor-pointer active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-[#FEF9C3] rounded-xl flex flex-shrink-0 items-center justify-center transition-colors group-hover:bg-[#FFD700]">
                            {getIconForType(item.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${getBadgeForType(item.type)}`}>
                                {item.type}
                              </span>
                              <span className="text-xs text-gray-400 font-medium">
                                Saved on {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#A16207] transition-colors line-clamp-1">{item.title}</h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pl-4 border-l border-gray-50">
                          <button
                            onClick={(e) => removeBookmark(item.id, e)}
                            className="text-gray-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remove Bookmark"
                          >
                            <Bookmark className="w-6 h-6 fill-current" />
                          </button>
                          <div className="w-10 h-10 rounded-full bg-[#FEF9C3] text-[#CA8A04] flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FFD700] group-hover:text-gray-900 transition-all font-bold">
                            <PlayCircle className="w-5 h-5" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-24 text-center"
                    >
                      <p className="text-xl text-gray-400 font-medium">You don't have any bookmarks yet.</p>
                      <p className="text-gray-400 mt-2">Explore the library to save interesting materials here.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}