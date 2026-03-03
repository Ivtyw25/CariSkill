'use client';

import { use } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { flashcardSets } from '@/lib/flashcards-data';
import { notFound, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, History, CheckCircle2, HelpCircle, RotateCcw } from 'lucide-react';

export default function FlashcardSummaryPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id, moduleId } = use(params);
  const data = flashcardSets[moduleId];
  const router = useRouter();

  if (!data) return notFound();

  const totalCards = data.cards.length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col items-center py-10 px-4 h-full">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-4xl mx-auto mb-10 text-center z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-6"
          >
            Flashcard Summary: {data.title}
          </motion.h1>

          {/* Hero Mastery Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
            className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 md:p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FFD700] to-[#E6C200]" />
            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-[#FEF9C3] rounded-full flex items-center justify-center mb-4 ring-4 ring-[#FEF3C7]">
                <Trophy className="w-10 h-10 text-[#CA8A04]" />
              </div>
              <h2 className="font-display text-4xl font-bold text-gray-900 mb-2">
                {totalCards}/{totalCards} Cards Mastered!
              </h2>
              <p className="text-gray-500 font-medium text-lg">
                You've completed this topic perfectly. Keep up the great work!
              </p>
            </div>
          </motion.div>
        </div>

        {/* Cards Studied Grid */}
        <div className="w-full max-w-4xl mx-auto mb-12 z-10">
          <h3 className="font-display text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <History className="w-6 h-6 text-[#CA8A04]" />
            Cards Studied
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.cards.map((card, index) => (
              <motion.div 
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (index * 0.05) }}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                <h4 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-2">
                  {card.front}
                </h4>
                <div className="flex items-start gap-3 text-gray-600 text-sm mt-1">
                  <CheckCircle2 className="text-[#22C55E] w-5 h-5 shrink-0 mt-0.5" />
                  {/* Joining the array of strings from the back of the card so it reads smoothly */}
                  <p className="leading-relaxed">{card.back.join(" ")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-2xl mx-auto mb-8 z-10"
        >
          <button 
            onClick={() => router.push(`/skill/${id}/${moduleId}/quiz`)}
            className="w-full sm:w-auto px-8 py-4 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group active:scale-95"
          >
            <HelpCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
            Start Quiz
          </button>
          <button 
            onClick={() => router.push(`/skill/${id}/${moduleId}/flashcards`)}
            className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold text-lg rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            Review Again
          </button>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}