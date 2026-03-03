'use client';

import { use, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { quizSets } from '@/lib/quiz-data';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Trophy, History, ArrowRight, Star, Sparkles, PartyPopper, Award
} from 'lucide-react';

function QuizSummaryContent({ id, moduleId }: { id: string, moduleId: string }) {
  const data = quizSets[moduleId];
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!data) return notFound();

  const totalQuestions = data.questions.length;
  // Get score from URL, default to total if not found
  const score = Number(searchParams.get('score')) || totalQuestions; 
  const accuracy = Math.round((score / totalQuestions) * 100);

  // Determine feedback message based on score
  let feedbackTitle = "Great job!";
  let feedbackText = "You've mastered the basics of this topic.";
  if (accuracy === 100) {
    feedbackTitle = "Perfect Score!";
    feedbackText = "Flawless execution. You know this inside out.";
  } else if (accuracy < 60) {
    feedbackTitle = "Keep trying!";
    feedbackText = "Review your mistakes and try again. You've got this.";
  }

  return (
    <main className="flex-grow relative flex flex-col items-center justify-center py-8 px-4 h-full min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

      {/* Floating Confetti Icons */}
      <motion.div animate={{ y: [0, -15, 0], rotate: [-15, 5, -15] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute text-yellow-500/30 z-0" style={{ top: '15%', left: '15%' }}>
        <PartyPopper className="w-16 h-16" />
      </motion.div>
      <motion.div animate={{ y: [0, 20, 0], rotate: [15, -10, 15] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} className="absolute text-yellow-500/30 z-0" style={{ top: '25%', right: '20%' }}>
        <Star className="w-12 h-12" />
      </motion.div>
      <motion.div animate={{ y: [0, -10, 0], rotate: [45, 25, 45] }} transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }} className="absolute text-yellow-500/30 z-0" style={{ bottom: '20%', left: '20%' }}>
        <Award className="w-14 h-14" />
      </motion.div>
      <motion.div animate={{ y: [0, 15, 0], rotate: [-30, 0, -30] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }} className="absolute text-yellow-500/30 z-0" style={{ bottom: '15%', right: '15%' }}>
        <Sparkles className="w-16 h-16" />
      </motion.div>

      {/* Header */}
      <div className="text-center z-10 mb-8 max-w-3xl w-full">
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
          className="inline-flex items-center justify-center p-4 mb-6 rounded-full bg-[#FEF9C3] text-[#CA8A04] shadow-sm"
        >
          <Trophy className="w-10 h-10" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          Quiz Completed!
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-sans text-xl text-gray-600">
          {data.title}
        </motion.p>
      </div>

      {/* Results Card */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="w-full bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center p-8 md:p-10 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFD700] to-[#E6C200]" />
          
          {/* Circular Progress SVG - Fixed Centering */}
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path 
                className="fill-none stroke-gray-100 stroke-[3.5]" 
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
              <motion.path 
                className="fill-none stroke-[#FFD700] stroke-[3.5]" 
                strokeLinecap="round"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${accuracy}, 100` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold font-display text-gray-900">{score}/{totalQuestions}</span>
              <span className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Correct</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-12 w-full mb-8 border-b border-gray-100 pb-8">
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Time Spent</span>
              <span className="font-display font-bold text-xl text-gray-800">4m 32s</span> {/* Placeholder time */}
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Accuracy</span>
              <span className="font-display font-bold text-xl text-gray-800">{accuracy}%</span>
            </div>
          </div>

          {/* Dynamic Feedback */}
          <div className="text-center mb-2">
            <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{feedbackTitle}</h3>
            <p className="text-gray-600 text-lg">{feedbackText}</p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 w-full"
        >
          <button 
            onClick={() => router.push(`/skill/${id}/${moduleId}/quiz?mode=review`)}
            className="flex-1 py-4 px-6 rounded-2xl bg-white border-2 border-gray-200 text-gray-800 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center justify-center gap-2 group active:scale-95"
          >
            <History className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Review Mistakes
          </button>
          <button 
            onClick={() => router.push(`/skill/${id}`)}
            className="flex-1 py-4 px-6 rounded-2xl bg-[#FFD700] text-gray-900 font-bold hover:bg-[#E6C200] transition-all shadow-md flex items-center justify-center gap-2 group active:scale-95"
          >
            Continue Roadmap
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </main>
  );
}

// Main Page Component
export default function QuizSummaryPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id, moduleId } = use(params);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />
      
      {/* Suspense is required when using useSearchParams() in Next.js */}
      <Suspense fallback={<div className="flex-grow flex items-center justify-center">Loading results...</div>}>
        <QuizSummaryContent id={id} moduleId={moduleId} />
      </Suspense>

      <Footer />
    </div>
  );
}