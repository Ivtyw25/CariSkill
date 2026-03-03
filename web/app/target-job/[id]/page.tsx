'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, DollarSign, ExternalLink,
  CircleDashed, AlertTriangle, Clock, CheckCircle2, Zap, Check, PenTool, Loader2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('target_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setJob(data);
      } else {
        console.error("Failed to load job details:", error);
      }
    };

    fetchJobDetail();
  }, [id]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-300';
      case 'medium': return 'bg-yellow-400';
      default: return 'bg-gray-300';
    }
  };

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
        <Loader2 className="w-10 h-10 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-7xl z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Sidebar />

          <section className="lg:col-span-3 flex flex-col h-full">
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">

              {/* Header Card */}
              <motion.div variants={itemVariants as any} className="bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-500">
                  <PenTool className="w-10 h-10" />
                </div>
                <div className="flex-grow">
                  <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm font-medium mb-6">
                    <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {job.company}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                    <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" /> {job.salary}</span>
                  </div>

                  {/* WIRED UP: View Original Ad */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(`/target-job/${id}/ad`)}
                    className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 text-sm shadow-sm"
                  >
                    View Original Ad <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>

              {/* Stats Row */}
              <motion.div variants={itemVariants as any} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 flex-shrink-0">
                    <CircleDashed className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-0.5">Matching Score</p>
                    <p className="font-display font-bold text-2xl text-gray-900">{job.stats.matchingScore}%</p>
                  </div>
                </div>

                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-0.5">Critical Gaps</p>
                    <p className="font-display font-bold text-2xl text-gray-900">{job.stats.criticalGaps}</p>
                  </div>
                </div>

                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-0.5">Est. Time to Ready</p>
                    <p className="font-display font-bold text-2xl text-gray-900">{job.stats.timeToReady}</p>
                  </div>
                </div>
              </motion.div>

              {/* Skills Split View */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Skills You Have */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                  <h2 className="font-display text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <CheckCircle2 className="w-6 h-6 text-green-500" /> Skills You Have
                  </h2>
                  <div className="flex flex-col gap-3">
                    {job.skills_have.map((skill: string, index: number) => (
                      <motion.div
                        key={index}
                        whileHover={{ x: 4 }}
                        className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="font-semibold text-gray-800">{skill}</span>
                        </div>
                        <Check className="w-5 h-5 text-green-500" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Skills To Acquire */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
                  <h2 className="font-display text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <Zap className="w-6 h-6 text-[#CA8A04]" /> Skills to Acquire
                  </h2>
                  <div className="flex flex-col gap-3">
                    {job.skills_acquire.map((skill: any, index: number) => (
                      <motion.div
                        key={index}
                        whileHover={{ y: -2 }}
                        className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center transition-shadow hover:shadow-md hover:border-yellow-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(skill.priority)}`} />
                          <span className="font-semibold text-gray-800">{skill.name}</span>
                        </div>

                        {/* WIRED UP: Add to Roadmap */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => router.push(`/setup?topic=${encodeURIComponent(skill.name)}`)}
                          className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-2 px-4 rounded-lg text-sm shadow-sm whitespace-nowrap w-full sm:w-auto"
                        >
                          Add to Roadmap
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>

              </motion.div>

            </motion.div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}