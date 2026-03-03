'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Award } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function SetupPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [topic, setTopic] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (!topic.trim()) return;

    // If the auth hook is still resolving, we shouldn't act yet.
    if (authLoading) {
      console.log("Auth is still loading, please wait...");
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a temporary session ID for localStorage
      const sessionId = crypto.randomUUID();
      // Save the initial topic the user wants to learn so the chat page can pick it up
      localStorage.setItem(`chat_initial_topic_${sessionId}`, topic.trim());

      // Redirect to the chat page directly with the session ID
      router.push(`/chat?id=${sessionId}`);
    } catch (error) {
      console.error('Error starting chat session:', error);
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900 overflow-hidden">
      <Navbar isLoggedIn={true} />
      <main className="flex-grow relative flex flex-col items-center justify-center py-12 px-4 h-full min-h-[calc(100vh-5rem)]">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key="bg-icons"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <GraduationCap className="absolute left-[5%] md:left-[10%] top-[45%] w-32 h-32 text-[#FFD700] opacity-20 -rotate-12" />
              <Award className="absolute right-[5%] md:right-[10%] top-[55%] w-32 h-32 text-[#FFD700] opacity-20 rotate-12" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full max-w-3xl z-10 flex flex-col items-center mt-12">
          <AnimatePresence mode="wait">
            <motion.div
              variants={slideVariants}
              initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full flex flex-col items-center text-center"
            >
              <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                What do you want to learn?
              </h1>
              <p className="text-gray-500 text-lg mb-12 max-w-md">
                Tell us the topic or goal, and our AI will build your personalized path.
              </p>

              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                placeholder="e.g., Python Programming, Digital Marketing..."
                className="w-full max-w-lg p-5 rounded-2xl border-2 border-gray-100 hover:border-gray-200 focus:border-[#FFD700] outline-none shadow-sm text-lg transition-colors bg-white/90 backdrop-blur-sm"
                autoFocus
              />
            </motion.div>
          </AnimatePresence>

          <motion.div className="mt-12" layout>
            <button
              onClick={handleNext}
              disabled={isSubmitting || !topic.trim()}
              className="px-10 py-4 rounded-full bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold text-lg flex items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Starting..." : "Start Exploring 🚀"}
            </button>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}