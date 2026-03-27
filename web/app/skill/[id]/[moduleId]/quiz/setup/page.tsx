'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GraduationCap, Loader2, ListChecks, PenLine, Layers, History, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type QuestionType = 'multiple-choice' | 'open-ended' | 'both';

const questionTypeOptions = [
  {
    id: 'multiple-choice' as QuestionType,
    label: 'Multiple Choice',
    description: 'Choose from 4 options. Great for recall.',
    icon: <ListChecks className="w-6 h-6" />,
  },
  {
    id: 'open-ended' as QuestionType,
    label: 'Open-Ended',
    description: 'Write your own answers. Deeper understanding.',
    icon: <PenLine className="w-6 h-6" />,
  },
  {
    id: 'both' as QuestionType,
    label: 'Mixed',
    description: 'A combination of both types.',
    icon: <Layers className="w-6 h-6" />,
  },
];

const questionCountOptions = [5, 10, 15, 20];

function QuizSetupContent({ id, moduleId }: { id: string; moduleId: string }) {
  const router = useRouter();
  const [moduleTitle, setModuleTitle] = useState('Quiz');
  const [selectedType, setSelectedType] = useState<QuestionType>('multiple-choice');
  const [selectedCount, setSelectedCount] = useState(10);
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch module title
        const { data: nodeData } = await supabase
          .from('roadmap_nodes')
          .select('title')
          .eq('node_id', moduleId)
          .limit(1);
        if (nodeData && nodeData.length > 0) {
          setModuleTitle(nodeData[0].title);
        }

        // Fetch history count
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { count } = await supabase
              .from('quiz_results')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('node_id', moduleId);
            setHistoryCount(count ?? 0);
          }
        } catch {
          // table may not exist yet
        }
      } catch (err) {
        console.error('Failed to load setup data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [moduleId]);

  const handleStart = () => {
    router.push(
      `/skill/${id}/${moduleId}/quiz?type=${selectedType}&count=${selectedCount}`
    );
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-grow relative flex flex-col items-center justify-center py-12 px-4 min-h-[calc(100vh-5rem)]">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <GraduationCap className="absolute left-[5%] md:left-[10%] top-[45%] w-32 h-32 text-[#FFD700] opacity-20 -rotate-12" />
        <ListChecks className="absolute right-[5%] md:right-[10%] top-[55%] w-32 h-32 text-[#FFD700] opacity-20 rotate-12" />
      </div>

      <div className="w-full max-w-2xl z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full flex flex-col items-center text-center"
        >
          <span className="inline-block px-4 py-1.5 bg-[#FEF9C3] text-[#854D0E] text-xs font-bold uppercase tracking-widest rounded-full mb-4 border border-[#FDE68A]">
            Quiz Setup
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight capitalize">
            {moduleTitle}
          </h1>
          <p className="text-gray-500 text-base mb-10 max-w-md">
            Customise your quiz — all subtopics in this module will be covered.
          </p>

          {/* Number of questions */}
          <div className="w-full mb-8">
            <p className="text-sm font-bold text-gray-700 mb-3 text-left">Number of Questions</p>
            <div className="flex gap-3">
              {questionCountOptions.map((count) => (
                <button
                  key={count}
                  onClick={() => setSelectedCount(count)}
                  className={`flex-1 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${selectedCount === count
                    ? 'bg-[#FFD700] border-[#FFD700] text-gray-900 shadow-md'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#FFD700]'}`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Question type selection */}
          <div className="w-full mb-10">
            <p className="text-sm font-bold text-gray-700 mb-3 text-left">Question Type</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {questionTypeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedType(option.id)}
                  className={`relative flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer group ${selectedType === option.id
                    ? 'border-[#FFD700] bg-[#FFFBEB] shadow-lg shadow-[#FFD700]/20'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'}`}
                >
                  {selectedType === option.id && (
                    <div className="absolute top-3 right-3 w-4 h-4 bg-[#FFD700] rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${selectedType === option.id
                    ? 'bg-[#FFD700] text-gray-900'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                    {option.icon}
                  </div>
                  <span className="font-bold text-gray-900 text-sm mb-1">{option.label}</span>
                  <span className="text-xs text-gray-500 leading-relaxed">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Start button */}
          <motion.button
            onClick={handleStart}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full max-w-xs px-10 py-4 rounded-full bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-colors mb-4"
          >
            Start Quiz 🎯
          </motion.button>

          {/* View history button */}
          <button
            onClick={() => router.push(`/skill/${id}/${moduleId}/quiz/history`)}
            className="flex items-center gap-2 px-6 py-3 text-gray-500 hover:text-gray-900 hover:bg-white rounded-full border border-transparent hover:border-gray-200 transition-all text-sm font-medium"
          >
            <History className="w-4 h-4" />
            View Past Results
            {historyCount !== null && historyCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                {historyCount}
              </span>
            )}
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </main>
  );
}

export default function QuizSetupPage({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const { id, moduleId } = use(params);
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900 overflow-hidden">
      <Navbar isLoggedIn={true} />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" /></div>}>
        <QuizSetupContent id={id} moduleId={moduleId} />
      </Suspense>
      <Footer />
    </div>
  );
}
