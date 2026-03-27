'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, BookOpen, Lightbulb, HelpCircle,
  CheckCircle2, XCircle, Loader2, Sparkles, Trophy, AlertTriangle,
  ArrowRight, RotateCcw, ThumbsUp
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import BookmarkButton from '@/components/BookmarkButton';
import { useSkillLanguage } from '@/components/SkillLanguageProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionType = 'multiple-choice' | 'open-ended' | 'both';

interface MCQQuestion {
  id: string;
  type: 'multiple-choice';
  question: string;
  options: string[];
  correctAnswerIndex: number;
  hint: string;
  explanation: string;
  sourceMaterial?: string;
}

interface OpenEndedQuestion {
  id: string;
  type: 'open-ended';
  question: string;
  modelAnswer: string;
  hint: string;
  keyPoints: string[];
  sourceMaterial?: string;
}

type Question = MCQQuestion | OpenEndedQuestion;

// ─── QuizContent ──────────────────────────────────────────────────────────────
function QuizContent({ id, moduleId }: { id: string; moduleId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReviewMode = searchParams.get('mode') === 'review';
  const questionType = (searchParams.get('type') || 'multiple-choice') as QuestionType;
  const numQuestions = parseInt(searchParams.get('count') || '10');
  const { currentLanguage, translateText } = useSkillLanguage();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [moduleTitle, setModuleTitle] = useState('Quiz');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [openAnswer, setOpenAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [allAnswers, setAllAnswers] = useState<(number | string)[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; total: number } | null>(null);

  // ─── Load module and generate quiz from ALL subtopics ─────────────────────
  useEffect(() => {
    const fetchAndGenerate = async () => {
      try {
        const supabase = createClient();

        // Fetch module title
        const { data: nodeData } = await supabase
          .from('roadmap_nodes')
          .select('title')
          .eq('node_id', moduleId)
          .limit(1);
        const title = nodeData?.[0]?.title || 'Quiz';
        const displayTitle = currentLanguage === 'en'
          ? title
          : await translateText(title, currentLanguage);
        setModuleTitle(displayTitle);

        // Fetch last result
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: lastRes } = await supabase
              .from('quiz_results')
              .select('score, total')
              .eq('user_id', user.id)
              .eq('node_id', moduleId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastRes) setLastResult(lastRes);
          }
        } catch { /* table may not exist yet */ }

        // Fetch ALL micro-topics content for this module
        const { data: topicsData } = await supabase
          .from('micro_topics_contents')
          .select('id, content')
          .eq('macro_node_id', moduleId)
          .order('id', { ascending: true });

        if (!topicsData || topicsData.length === 0) {
          setError('No study materials found for this module.');
          setLoading(false);
          return;
        }

        // Combine all theory explanations into one block
        const parsed = topicsData.map(t =>
          typeof t.content === 'string' ? JSON.parse(t.content) : t.content
        ).filter(Boolean);

        const combinedTheory = parsed
          .map((t: any) => `## ${t.topic_title || ''}\n${t.theory_explanation || ''}`)
          .join('\n\n');

        setLoading(false);
        setGenerating(true);

        // Generate quiz
        const res = await fetch('/api/generate/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicTitle: title,
            theoryExplanation: combinedTheory,
            questionType,
            numQuestions,
          }),
        });

        const data = await res.json();
        if (!data.quiz?.questions) {
          setError('Failed to generate quiz. Please try again.');
          setGenerating(false);
          return;
        }

        // Optionally translate in one batch for performance
        if (currentLanguage !== 'en') {
          const stringsToTranslate: string[] = [];
          
          // 1. Collect all strings
          data.quiz.questions.forEach((q: any) => {
            stringsToTranslate.push(q.question);
            stringsToTranslate.push(q.hint || "");
            if (q.type === 'open-ended') {
              stringsToTranslate.push(q.modelAnswer || "");
            } else {
              stringsToTranslate.push(q.explanation || "");
              (q.options || []).forEach((opt: string) => stringsToTranslate.push(opt));
            }
          });

          // 2. Batch translate
          const translatedStrings = await translateText(stringsToTranslate, currentLanguage);
          
          // 3. Reassemble questions
          let sIdx = 0;
          const translatedQuestions = data.quiz.questions.map((q: any) => {
            const newQ = { ...q };
            newQ.question = translatedStrings[sIdx++];
            newQ.hint = translatedStrings[sIdx++];
            if (q.type === 'open-ended') {
              newQ.modelAnswer = translatedStrings[sIdx++];
            } else {
              newQ.explanation = translatedStrings[sIdx++];
              newQ.options = q.options.map(() => translatedStrings[sIdx++]);
            }
            return newQ;
          });
          setQuestions(translatedQuestions);
        } else {
          setQuestions(data.quiz.questions);
        }
      } catch (err) {
        setError('Failed to load quiz.');
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    };
    fetchAndGenerate();
  }, [moduleId, currentLanguage, questionType, numQuestions]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] as any;
  const isMCQ = currentQuestion?.type !== 'open-ended';
  const isCorrect = isMCQ && currentQuestion && selectedOption === currentQuestion.correctAnswerIndex;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const labels = ['A', 'B', 'C', 'D'];

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectMCQ = (idx: number) => {
    if (!isSubmitted && !isReviewMode) {
      setSelectedOption(idx);
      setIsSubmitted(true);
      setShowHint(false);
      const newAnswers = [...allAnswers];
      newAnswers[currentIndex] = idx;
      setAllAnswers(newAnswers);
      if (idx === currentQuestion.correctAnswerIndex) setScore(prev => prev + 1);
    }
  };

  const handleSubmitOpenEnded = () => {
    if (!isSubmitted && openAnswer.trim()) {
      setIsSubmitted(true);
      setShowHint(false);
      const newAnswers = [...allAnswers];
      newAnswers[currentIndex] = openAnswer;
      setAllAnswers(newAnswers);
      // No longer incrementing score here; AI will mark it at the end
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      if (!isReviewMode) {
        setSelectedOption(null);
        setOpenAnswer('');
        setIsSubmitted(false);
      }
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (!isReviewMode) {
        setSelectedOption(null);
        setOpenAnswer('');
        setIsSubmitted(false);
      }
      setShowHint(false);
    }
  };

  const handleFinishQuiz = async () => {
    setQuizFinished(true);
    setAnalysisLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Get roadmap_id
      const { data: roadmapNodeData } = await supabase
        .from('roadmap_nodes')
        .select('roadmap_id')
        .eq('node_id', moduleId)
        .limit(1)
        .maybeSingle();

      const roadmapId = roadmapNodeData?.roadmap_id || id;

      // Get AI analysis (now includes openEndedMarking)
      const analysisRes = await fetch('/api/generate/quiz-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions,
          answers: allAnswers,
          topicTitle: moduleTitle,
          moduleId,
          questionType,
        }),
      });
      const analysisData = await analysisRes.json();
      setAnalysis(analysisData);

      // Re-calculate final score including Open-Ended marks
      const mcqQs = questions.filter(q => q.type !== 'open-ended') as MCQQuestion[];
      const mcqScore = mcqQs.reduce((acc, q) => {
        const qIndex = questions.indexOf(q);
        return acc + (allAnswers[qIndex] === q.correctAnswerIndex ? 1 : 0);
      }, 0);

      const oeCorrectCount = (analysisData.openEndedMarking || [])
        .filter((m: any) => m.isCorrect).length;

      const finalScore = mcqScore + oeCorrectCount;
      const finalTotal = questions.length;
      
      setScore(finalScore);

      // Save to Supabase with full questions data and get ID for redirection
      if (user) {
        const { data: insertedRec, error: insertError } = await supabase.from('quiz_results').insert({
          user_id: user.id,
          roadmap_id: roadmapId,
          node_id: moduleId,
          node_title: moduleTitle,
          score: finalScore,
          total: finalTotal,
          question_type: questionType,
          num_questions: totalQuestions,
          questions,
          answers: allAnswers,
          analysis: analysisData,
        }).select('id').single();

        if (insertError) {
           console.error('Insert error:', insertError.message);
           setAnalysisLoading(false);
           return;
        }

        if (insertedRec) {
          router.push(`/skill/${id}/${moduleId}/quiz/results/${insertedRec.id}`);
          return;
        }
      }
    } catch (err) {
      console.error('Finish quiz error:', err);
      setAnalysisLoading(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex-grow flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="flex-grow relative flex flex-col items-center py-8 px-4 h-full min-h-[calc(100vh-5rem)]">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

      {/* Header */}
      <div className="text-center z-10 mb-6 max-w-3xl w-full">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 capitalize">{moduleTitle} — Quiz</h1>
          {lastResult && !quizFinished && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
              <Trophy className="w-3.5 h-3.5" />
              Last: {lastResult.score}/{lastResult.total}
            </span>
          )}
        </div>

        {!quizFinished && (
          <>
            {/* Type badge */}
            <span className="inline-block px-3 py-1 bg-[#FEF9C3] text-[#854D0E] text-xs font-bold uppercase tracking-wide rounded-full mb-3 border border-[#FDE68A]">
              {questionType === 'multiple-choice' ? 'Multiple Choice' : questionType === 'open-ended' ? 'Open-Ended' : 'Mixed'} · {numQuestions} Questions
            </span>

            {/* Progress bar */}
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
              <p className="text-sm text-gray-500 mt-1">AI is creating {numQuestions} questions covering all subtopics</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !generating && (
          <div className="w-full max-w-3xl p-8 bg-red-50 rounded-3xl border border-red-100 text-center">
            <p className="text-red-700 font-bold mb-4">{error}</p>
            <button onClick={() => router.back()} className="px-6 py-2 bg-[#FFD700] rounded-xl font-bold">Go Back</button>
          </div>
        )}

        {/* ═══ QUIZ FINISHED LOADING ═══ */}
        {quizFinished && !generating && analysisLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-6 p-12 flex flex-col items-center justify-center gap-6">
               <Loader2 className="w-16 h-16 text-[#FFD700] animate-spin" />
               <div className="text-center">
                  <h2 className="font-display text-2xl font-bold text-gray-900">Calculating Results...</h2>
                  <p className="text-gray-500 mt-2">AI is analyzing your performance and marking open-ended responses.</p>
               </div>
            </div>
          </motion.div>
        )}

        {/* ═══ QUIZ IN PROGRESS ═══ */}
        {!generating && !error && currentQuestion && !quizFinished && (
          <div className="w-full flex items-center justify-center gap-4 md:gap-8">
            <button onClick={handlePrev} disabled={currentIndex === 0}
              className="hidden md:flex items-center justify-center w-14 h-14 shrink-0 text-gray-400 hover:text-[#CA8A04] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-10 h-10" />
            </button>

            <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col relative overflow-hidden p-8 md:p-10 min-h-[400px]">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FFD700] to-[#E6C200]" />

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wide rounded-full">
                    {isReviewMode ? 'Review Mode' : isMCQ ? 'Multiple Choice' : 'Open-Ended'}
                  </span>
                  {currentQuestion.sourceMaterial && (
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wide rounded-full border border-purple-200">
                      {currentQuestion.sourceMaterial}
                    </span>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <motion.h2 key={currentQuestion.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="font-display text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                    {currentQuestion.question}
                  </motion.h2>
                </AnimatePresence>
              </div>

              {/* MCQ options */}
              {isMCQ && (
                <div className="grid grid-cols-1 gap-3 w-full pb-8">
                  {currentQuestion.options.map((option: string, idx: number) => {
                    let btnClass = "border-gray-100 hover:border-[#FFD700]/50 bg-white group";
                    let letterClass = "bg-gray-100 text-gray-600 group-hover:bg-[#FFD700] group-hover:text-gray-900";
                    if (isSubmitted || isReviewMode) {
                      if (idx === currentQuestion.correctAnswerIndex) {
                        btnClass = "border-green-500 bg-green-50"; letterClass = "bg-green-500 text-white";
                      } else if (idx === selectedOption && !isReviewMode) {
                        btnClass = "border-red-500 bg-red-50"; letterClass = "bg-red-500 text-white";
                      } else {
                        btnClass = "border-gray-100 opacity-50 bg-white"; letterClass = "bg-gray-100 text-gray-400";
                      }
                    }
                    return (
                      <motion.button 
                        key={idx} 
                        whileHover={!isSubmitted && !isReviewMode ? { x: 5, scale: 1.01, backgroundColor: '#FEF9C3' } : {}}
                        whileTap={!isSubmitted && !isReviewMode ? { scale: 0.98 } : {}}
                        onClick={() => handleSelectMCQ(idx)} 
                        disabled={isSubmitted || isReviewMode}
                        className={`flex items-center w-full p-4 text-left border-2 rounded-2xl transition-all focus:outline-none ${btnClass}`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full font-bold flex items-center justify-center mr-4 transition-colors ${letterClass}`}>
                          {labels[idx]}
                        </div>
                        <span className="text-lg font-medium flex-grow">{option}</span>
                        {isSubmitted && idx === currentQuestion.correctAnswerIndex && <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 ml-2" />}
                        {isSubmitted && idx === selectedOption && !isReviewMode && idx !== currentQuestion.correctAnswerIndex && <XCircle className="w-6 h-6 text-red-600 shrink-0 ml-2" />}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Open-ended input */}
              {!isMCQ && !isReviewMode && (
                <div className="w-full pb-8">
                  <textarea value={openAnswer} onChange={(e) => setOpenAnswer(e.target.value)} disabled={isSubmitted}
                    placeholder="Type your answer here..." rows={5}
                    className={`w-full p-4 border-2 rounded-2xl resize-none outline-none text-gray-800 font-medium leading-relaxed transition-colors ${isSubmitted ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 hover:border-[#FFD700] focus:border-[#FFD700] bg-white'}`}
                  />
                  {!isSubmitted && (
                    <motion.button 
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSubmitOpenEnded} 
                      disabled={!openAnswer.trim()}
                      className="mt-3 px-6 py-2.5 bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 rounded-xl font-bold transition-all shadow-md hover:shadow-lg">
                      Submit Answer
                    </motion.button>
                  )}
                </div>
              )}

              {/* Open-ended review */}
              {!isMCQ && isReviewMode && (
                <div className="w-full pb-8">
                  <div className="p-4 bg-[#FEF9C3] rounded-2xl border border-[#FDE68A]">
                    <p className="text-xs font-bold text-[#854D0E] uppercase tracking-wide mb-2">Model Answer</p>
                    <p className="text-[#854D0E] text-sm leading-relaxed">{currentQuestion.modelAnswer}</p>
                    {currentQuestion.keyPoints?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-[#854D0E] uppercase tracking-wide mb-1">Key Points</p>
                        <ul className="space-y-1">
                          {currentQuestion.keyPoints.map((kp: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-[#854D0E] text-sm">
                              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#CA8A04]" />{kp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hint */}
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

              {/* Open-ended: show model answer after submit */}
              {!isMCQ && isSubmitted && !isReviewMode && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 bg-[#FEF9C3] rounded-2xl border border-[#FDE68A]">
                    <p className="text-xs font-bold text-[#854D0E] uppercase tracking-wide mb-2">Model Answer</p>
                    <p className="text-[#854D0E] text-sm leading-relaxed mb-3">{currentQuestion.modelAnswer}</p>
                    {currentQuestion.keyPoints?.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-[#854D0E] uppercase tracking-wide mb-1">Key Points</p>
                        <ul className="space-y-1">
                          {currentQuestion.keyPoints.map((kp: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-[#854D0E] text-sm">
                              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#CA8A04]" />{kp}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Hint & help buttons */}
              <div className="absolute bottom-6 right-6 flex gap-3 z-10">
                <motion.button 
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowHint(!showHint)} 
                  disabled={isSubmitted || isReviewMode}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-sm border ${showHint ? 'bg-[#FFD700] text-gray-900 border-[#E6C200]' : 'bg-white text-gray-400 hover:text-[#CA8A04] hover:bg-[#FEF9C3] border-gray-200'} disabled:opacity-50`}
                  title="Hint">
                  <Lightbulb className="w-5 h-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-gray-400 hover:text-blue-500 hover:bg-blue-50 border border-gray-200 transition-all shadow-sm" title="Help">
                  <HelpCircle className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <motion.button 
              whileHover={{ x: 5, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNext} 
              disabled={currentIndex === totalQuestions - 1 || (!isSubmitted && !isReviewMode)}
              className="hidden md:flex items-center justify-center w-14 h-14 shrink-0 text-gray-400 hover:text-[#CA8A04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-10 h-10" />
            </motion.button>
          </div>
        )}

        {/* MCQ explanation */}
        {!generating && !error && currentQuestion && isMCQ && !quizFinished && (
          <div className="w-full max-w-2xl mx-auto min-h-[4rem] flex items-center justify-center text-center px-4">
            <AnimatePresence mode="wait">
              {isSubmitted || isReviewMode ? (
                <motion.div key="exp" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className={`text-sm md:text-base font-medium rounded-xl p-4 border ${isCorrect || isReviewMode ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                  {!isReviewMode && <strong className="block mb-1">{isCorrect ? 'Spot on!' : 'Not quite.'}</strong>}
                  {isReviewMode && <strong className="block mb-1">Explanation:</strong>}
                  {(currentQuestion as MCQQuestion).explanation}
                </motion.div>
              ) : (
                <motion.p key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 italic opacity-60">
                  (Explanation will appear here after answering)
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Utility buttons */}
        {!generating && !error && !quizFinished && (
          <div className="flex gap-4 mt-2 mb-6">
            <button onClick={() => router.push(`/skill/${id}/${moduleId}/materials`)} className="flex flex-col items-center gap-1 group" title="Materials">
              <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-gray-600 group-hover:text-[#CA8A04] group-hover:bg-[#FEF9C3] border border-gray-200 transition-all shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
            </button>
            <div className="flex flex-col items-center gap-1">
              <BookmarkButton roadmapId={id} moduleId={moduleId} type="quiz" title={`${moduleTitle} - Quiz`} className="w-12 h-12" />
            </div>
          </div>
        )}

        {/* Finish button */}
        <AnimatePresence>
          {!isReviewMode && !generating && isSubmitted && isLastQuestion && !quizFinished && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <motion.button 
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleFinishQuiz}
                className="flex items-center gap-2 px-8 py-3.5 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-full font-bold shadow-lg transition-all">
                <Trophy className="w-5 h-5" /> Finish & See Results
              </motion.button>
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
      {!quizFinished && (
        <div className="flex md:hidden justify-between w-full max-w-md px-4 mt-auto mb-6">
          <button onClick={handlePrev} disabled={currentIndex === 0}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 shadow-sm disabled:opacity-30">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={handleNext} disabled={currentIndex === totalQuestions - 1 || (!isSubmitted && !isReviewMode)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-[#FFD700] text-gray-900 shadow-md disabled:opacity-30">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </main>
  );
}

export default function QuizPage({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
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