'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Map, PlusCircle, Clock, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface RoadmapRecord {
  id: string;
  topic: string;
  created_at: string;
  content: any;
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

      const { data, error } = await supabase
        .from('roadmaps')
        .select('id, topic, created_at, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setRoadmaps(data);
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans">
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
            <p className="text-gray-500 mt-1">All your AI-generated learning roadmaps</p>
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
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {roadmaps.map((rm) => {
              const phases = getPhaseCount(rm.content);
              return (
                <motion.div
                  key={rm.id}
                  variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                >
                  <Link
                    href={`/skill/${rm.id}/overview`}
                    className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-yellow-300 transition-all p-6"
                  >
                    {/* Topic Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center border border-yellow-200 shrink-0">
                        <Map className="w-6 h-6 text-yellow-600" />
                      </div>
                      <ArrowRight
                        size={18}
                        className="text-gray-300 group-hover:text-yellow-500 group-hover:translate-x-1 transition-all mt-1"
                      />
                    </div>

                    <h2 className="font-bold text-gray-900 text-lg leading-snug mb-1 group-hover:text-yellow-700 transition-colors">
                      {rm.topic}
                    </h2>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(rm.created_at)}
                      </span>
                      {phases > 0 && (
                        <span className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          {phases} phases
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
