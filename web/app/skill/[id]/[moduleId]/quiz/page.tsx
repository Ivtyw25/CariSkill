'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Bookmark,
  BookOpen, Lightbulb, HelpCircle, CheckCircle2, XCircle, Loader2, Sparkles
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import BookmarkButton from '@/components/BookmarkButton';

function QuizContent({ id, moduleId }: { id: string, moduleId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review';

  // Loading states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Module data
  const [moduleTitle, setModuleTitle] = useState('Quiz');
  const [microTopics, setMicroTopics] = useState<any[]>([]);
  const [topicIndex, setTopicIndex] = useState(0);

  // Quiz state
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const supabase = createClient();
        const { data: nodeData } = await supabase.from('roadmap_nodes').select('title').eq('node_id', moduleId).limit(1);
        if (nodeData && nodeData.length > 0) setModuleTitle(nodeData[0].title);

        const { data: topicsData } = await supabase
          .from('micro_topics_contents')
          .select('id, content, quiz_data')
          .eq('macro_node_id', moduleId)
          .order('id', { ascending: true });

        if (topicsData && topicsData.length > 0) {
          const parsed = topicsData.map(t => ({
            rowId: t.id,
            quiz_data: t.quiz_data,
            ...(typeof t.content === 'string' ? JSON.parse(t.content) : t.content),
          })).filter(Boolean);
          setMicroTopics(parsed);
        }
      } catch (err) {
        setError('Failed to load quiz topics.');
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [moduleId]);

  useEffect(() => {
    if (microTopics.length === 0) return;
    const topic = microTopics[topicIndex];
    if (!topic) return;

    const loadQuiz = async () => {
      setQuestions([]);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsSubmitted(false);
      setScore(0);
      setShowHint(false);

      if (topic.quiz_data?.questions) {
        setQuestions(topic.quiz_data.questions);
        return;
      }

      setGenerating(true);
      try {
        const res = await fetch('/api/generate/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            microTopicId: topic.rowId,
            topicTitle: topic.topic_title || `Sub-topic ${topicIndex + 1}`,
            theoryExplanation: topic.theory_explanation || '',
          }),
        });
        const data = await res.json();
        if (data.quiz?.questions) {
          setQuestions(data.quiz.questions);
          setMicroTopics(prev => prev.map((t, i) => i === topicIndex ? { ...t, quiz_data: data.quiz } : t));
        } else {
          setError('Failed to generate quiz. Please try again.');
        }
      } catch (err) {
        setError('Network error generating quiz.');
      } finally {
        setGenerating(false);
      }
    };

    loadQuiz();
  }, [topicIndex, microTopics.length]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isCorrect = currentQuestion && selectedOption === currentQuestion.correctAnswerIndex;

  const handleSelect = (idx: number) => {
    if (!isSubmitted && !isReviewMode) {
      setSelectedOption(idx);
      setIsSubmitted(true);
      setShowHint(false);
      if (idx === currentQuestion.correctAnswerIndex) setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      if (!isReviewMode) { setSelectedOption(null); setIsSubmitted(false); }
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (!isReviewMode) { setSelectedOption(null); setIsSubmitted(false); }
      setShowHint(false);
    }
  };

  const labels = ['A', 'B', 'C', 'D'];

  if (loading) return (
    <div className="flex-grow flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
    </div>
  );

  return (
    <main className="flex-grow relative flex flex-col items-center py-8 px-4 h-full min-h-[calc(100vh-5rem)]">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

      <div className="text-center z-10 mb-6 max-w-3xl w-full">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-2 capitalize">{moduleTitle} — Quiz</h1>

        {/* Sub-topic selector */}
        {microTopics.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {microTopics.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setTopicIndex(idx)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${topicIndex === idx ? 'bg-[#FFD700] text-gray-900' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#FFD700]'}`}
              >
                {t.topic_title || `Sub-topic ${idx + 1}`}
              </button>
            ))}
          </div>
        )}

        {totalQuestions > 0 && !generating && (
          <>
            <div className="flex items-center justify-center w-full max-w-lg mx-auto mb-4">
              <div className="relative w-full flex items-center justify-between">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 z-0" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#FFD700] z-0 transition-all duration-500"
                  style={{ width: totalQuestions > 1 ? `${(currentIndex / (totalQuestions - 1)) * 100}%` : '100%' }} />
                {questions.map((_, idx) => (
                  <div key={idx} className={`relative z-10 rounded-full transition-all duration-300 shadow-sm
                    ${idx < currentIndex ? 'w-4 h-4 border-2 border-[#FFD700] bg-[#FFD700]' : ''}
                    ${idx === currentIndex ? 'w-5 h-5 border-[3px] border-[#FFD700] bg-white ring-4 ring-[#FEF9C3] scale-110' : ''}
                    ${idx > currentIndex ? 'w-4 h-4 border-2 border-gray-300 bg-white' : ''}
                  `} />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 font-medium">Question {currentIndex + 1} of {totalQuestions}</p>
          </>
        )}
      </div>

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-6 relative z-10">

        {/* Generating */}
        {generating && (
          <div className="w-full max-w-3xl min-h-[400px] bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center justify-center gap-6">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <Sparkles className="w-12 h-12 text-[#FFD700]" />
            </motion.div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-lg">Generating Quiz...</p>
              <p className="text-sm text-gray-500 mt-1">AI is creating 5 questions for "{microTopics[topicIndex]?.topic_title}"</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !generating && (
          <div className="w-full max-w-3xl p-8 bg-red-50 rounded-3xl border border-red-100 text-center">
            <p className="text-red-700 font-bold mb-4">{error}</p>
            <button onClick={() => { setError(null); }} className="px-6 py-2 bg-[#FFD700] rounded-xl font-bold">Retry</button>
          </div>
        )}

        {/* Quiz question */}
        {!generating && !error && currentQuestion && (
          <div className="w-full flex items-center justify-center gap-4 md:gap-8">
            <button onClick={handlePrev} disabled={currentIndex === 0}
              className="hidden md:flex items-center justify-center w-14 h-14 shrink-0 text-gray-400 hover:text-[#CA8A04] transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-10 h-10" />
            </button>

            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col relative overflow-hidden p-8 md:p-10 min-h-[400px]">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFD700] to-[#E6C200]" />

              <div className="mb-8">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wide rounded-full mb-4">
                  {isReviewMode ? 'Review Mode' : 'Multiple Choice'}
                </span>
                <AnimatePresence mode="wait">
                  <motion.h2 key={currentQuestion.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="font-display text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                    {currentQuestion.question}
                  </motion.h2>
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full pb-8">
                {currentQuestion.options.map((option: string, idx: number) => {
                  let btnStateClass = "border-gray-100 hover:border-[#FFD700]/50 bg-white group";
                  let letterStateClass = "bg-gray-100 text-gray-600 group-hover:bg-[#FFD700] group-hover:text-gray-900";

                  if (isSubmitted || isReviewMode) {
                    if (idx === currentQuestion.correctAnswerIndex) {
                      btnStateClass = "border-green-500 bg-green-50 text-green-900";
                      letterStateClass = "bg-green-500 text-white";
                    } else if (idx === selectedOption && !isReviewMode) {
                      btnStateClass = "border-red-500 bg-red-50 text-red-900";
                      letterStateClass = "bg-red-500 text-white";
                    } else {
                      btnStateClass = "border-gray-100 opacity-50 bg-white";
                      letterStateClass = "bg-gray-100 text-gray-400";
                    }
                  }

                  return (
                    <button key={idx} onClick={() => handleSelect(idx)} disabled={isSubmitted || isReviewMode}
                      className={`flex items-center w-full p-4 text-left border-2 rounded-2xl transition-all duration-200 focus:outline-none ${btnStateClass}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full font-bold flex items-center justify-center mr-4 transition-colors ${letterStateClass}`}>
                        {labels[idx]}
                      </div>
                      <span className="text-lg font-medium flex-grow">{option}</span>
                      {isSubmitted && idx === currentQuestion.correctAnswerIndex && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 ml-2" />}
                      {isSubmitted && idx === selectedOption && !isReviewMode && idx !== currentQuestion.correctAnswerIndex && <XCircle className="w-6 h-6 text-red-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showHint && !isSubmitted && !isReviewMode && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-[#FEF9C3] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3 mb-8">
                      <Lightbulb className="w-5 h-5 text-[#CA8A04] shrink-0 mt-0.5" />
                      <p className="text-[#854D0E] text-sm font-medium leading-relaxed">{currentQuestion.hint}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-6 right-6 flex gap-3 z-10">
                <button onClick={() => setShowHint(!showHint)} disabled={isSubmitted || isReviewMode}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-sm ${showHint ? 'bg-[#FFD700] text-gray-900 border-[#E6C200]' : 'bg-white text-gray-400 hover:text-[#CA8A04] hover:bg-[#FEF9C3] border-gray-200'} border disabled:opacity-50`}
                  title="Need a hint?">
                  <Lightbulb className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-blue-500 hover:bg-blue-50 border border-gray-200 transition-all shadow-sm" title="Get help">
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <button onClick={handleNext} disabled={currentIndex === totalQuestions - 1 || (!isSubmitted && !isReviewMode)}
              className="hidden md:flex items-center justify-center w-14 h-14 shrink-0 text-gray-400 hover:text-[#CA8A04] transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-10 h-10" />
            </button>
          </div>
        )}

        {/* Explanation */}
        {!generating && !error && currentQuestion && (
          <div className="w-full max-w-2xl mx-auto min-h-[4rem] flex items-center justify-center text-center px-4">
            <AnimatePresence mode="wait">
              {isSubmitted || isReviewMode ? (
                <motion.div key="explanation" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className={`text-sm md:text-base font-medium rounded-xl p-4 border ${isCorrect || isReviewMode ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                  {!isReviewMode && <strong className="block mb-1">{isCorrect ? 'Spot on!' : 'Not quite.'}</strong>}
                  {isReviewMode && <strong className="block mb-1">Explanation:</strong>}
                  {currentQuestion.explanation}
                </motion.div>
              ) : (
                <motion.p key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 italic opacity-60">
                  (Explanation will appear here after answering)
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Utility buttons */}
        {!generating && !error && (
          <div className="flex gap-4 mt-2 mb-6">
            <button onClick={() => router.push(`/skill/${id}/${moduleId}/materials`)} className="flex flex-col items-center gap-1 group" title="Materials">
              <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-gray-600 group-hover:text-[#CA8A04] group-hover:bg-[#FEF9C3] border border-gray-200 transition-all shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
            </button>
            <div className="flex flex-col items-center gap-1" title="Bookmark">
              <BookmarkButton
                roadmapId={id}
                moduleId={moduleId}
                type="quiz"
                title={`${moduleTitle} - Quiz`}
                className="w-12 h-12"
              />
            </div>
          </div>
        )}

        {/* Results / Review Buttons */}
        <AnimatePresence>
          {!isReviewMode && !generating && isSubmitted && currentIndex === totalQuestions - 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <button
                onClick={() => router.push(`/skill/${id}/${moduleId}/summary`)}
                className="flex items-center gap-2 px-8 py-3.5 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-full font-bold shadow-lg transition-all active:scale-95">
                View Summary <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
          {isReviewMode && !generating && currentIndex === totalQuestions - 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <button onClick={() => router.push(`/skill/${id}`)}
                className="flex items-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-bold shadow-lg transition-all active:scale-95">
                Return to Roadmap
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden justify-between w-full max-w-md px-4 mt-auto mb-6">
        <button onClick={handlePrev} disabled={currentIndex === 0}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={handleNext} disabled={currentIndex === totalQuestions - 1 || (!isSubmitted && !isReviewMode)}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#FFD700] text-gray-900 shadow-md disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </main>
  );
}

export default function QuizPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id, moduleId } = use(params);
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" /></div>}>
        <QuizContent id={id} moduleId={moduleId} />
      </Suspense>
      <Footer />
    </div>
  );
}