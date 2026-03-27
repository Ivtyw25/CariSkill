'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Trophy, Calendar, CheckCircle2, AlertTriangle,
  BookOpen, ArrowRight, ChevronRight, ThumbsUp, ChevronDown, ChevronUp,
  XCircle, RotateCcw
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useSkillLanguage } from '@/components/SkillLanguageProvider';
import { useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface QuizResult {
  id: string;
  created_at: string;
  score: number;
  total: number;
  question_type: string;
  num_questions: number;
  questions: any[];
  answers: any[];
  analysis: any;
  node_id: string;
  node_title: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const scoreColor = (score: number, total: number) => {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return 'text-green-700 bg-green-100 border-green-200';
  if (pct >= 0.5) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
  return 'text-red-700 bg-red-100 border-red-200';
};

const labels = ['A', 'B', 'C', 'D'];

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ result, onClose, id, moduleId }: { result: QuizResult; onClose: () => void; id: string; moduleId: string }) {
  const router = useRouter();
  const { currentLanguage, translateText } = useSkillLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [translatedResult, setTranslatedResult] = useState<QuizResult>(result);
  const [isTranslating, setIsTranslating] = useState(false);

  const [uiLabels, setUiLabels] = useState<any>({
    aiAnalysis: 'AI Analysis',
    strengths: 'Strengths',
    improve: 'Areas to Improve',
    revise: 'Topics to Revise',
    mcq: 'Multiple Choice',
    openEnded: 'Open-Ended',
    questions: 'Questions'
  });

  useEffect(() => {
    const performTranslation = async () => {
      if (currentLanguage === 'en') return;
      setIsTranslating(true);
      try {
        // Translate Labels
        const labelsToTranslate = Object.values(uiLabels) as string[];
        const tLabels = await translateText(labelsToTranslate, currentLanguage);
        const newLabels = { ...uiLabels };
        Object.keys(uiLabels).forEach((key, i) => { newLabels[key] = tLabels[i]; });
        setUiLabels(newLabels);

        // Translate Result Analysis & Questions
        const analysis = result.analysis;
        const questions = result.questions;
        
        const textToTranslate = [
          analysis?.overallFeedback,
          analysis?.strengths,
          analysis?.weaknesses,
          ...(analysis?.subtopicsToRevise?.map((st: any) => st.title) || []),
          ...(analysis?.subtopicsToRevise?.map((st: any) => st.reason) || []),
          ...(questions?.map((q: any) => q.question) || []),
          ...(questions?.map((q: any) => q.explanation) || []),
          ...(questions?.map((q: any) => q.modelAnswer) || []),
          ...((questions?.flatMap((q: any) => q.options)) || [])
        ].filter(Boolean);

        const tText = await translateText(textToTranslate, currentLanguage);
        
        let ptr = 0;
        const newResult = JSON.parse(JSON.stringify(result));
        
        if (newResult.analysis) {
          newResult.analysis.overallFeedback = tText[ptr++];
          newResult.analysis.strengths = tText[ptr++];
          newResult.analysis.weaknesses = tText[ptr++];
          
          if (newResult.analysis.subtopicsToRevise) {
             newResult.analysis.subtopicsToRevise.forEach((st: any) => { st.title = tText[ptr++]; });
             newResult.analysis.subtopicsToRevise.forEach((st: any) => { st.reason = tText[ptr++]; });
          }
        }
        
        if (newResult.questions) {
           newResult.questions.forEach((q: any) => { q.question = tText[ptr++]; });
           newResult.questions.forEach((q: any) => { if(q.explanation) q.explanation = tText[ptr++]; });
           newResult.questions.forEach((q: any) => { if(q.modelAnswer) q.modelAnswer = tText[ptr++]; });
           newResult.questions.forEach((q: any) => { 
             if(q.options) {
               q.options = q.options.map(() => tText[ptr++]);
             }
           });
        }
        setTranslatedResult(newResult);
      } catch (err) {
        console.error("Review translation failed:", err);
      } finally {
        setIsTranslating(false);
      }
    };
    performTranslation();
  }, [result, currentLanguage]);

  const questions = translatedResult.questions || [];
  const answers = translatedResult.answers || [];
  const currentQ = questions[currentIndex] as any;
  const isMCQ = currentQ?.type !== 'open-ended';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#FFFDF6] rounded-3xl shadow-2xl"
      >
        {/* Modal header */}
        <div className="sticky top-0 z-10 bg-[#FFFDF6] border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {formatDate(result.created_at)} · {result.question_type === 'multiple-choice' ? uiLabels.mcq : result.question_type === 'open-ended' ? uiLabels.openEnded : 'Mixed'}
            </p>
            <h2 className="font-bold text-gray-900 text-lg mt-0.5">{translatedResult.node_title || 'Quiz Review'}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${scoreColor(result.score, result.total)}`}>
              <Trophy className="w-4 h-4" />
              {result.score}/{result.total}
            </span>
            <button onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Analysis */}
          {translatedResult.analysis && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#FFD700]/20 to-[#E6C200]/10 px-5 py-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-[#CA8A04]" /> {uiLabels.aiAnalysis}
                </h3>
              </div>
              <div className="p-5 space-y-4">
                {translatedResult.analysis.overallFeedback && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-blue-800 text-sm leading-relaxed">{translatedResult.analysis.overallFeedback}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {translatedResult.analysis.strengths && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <p className="font-bold text-gray-800 text-sm">{uiLabels.strengths}</p>
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed">{translatedResult.analysis.strengths}</p>
                    </div>
                  )}
                  {translatedResult.analysis.weaknesses && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <p className="font-bold text-gray-800 text-sm">{uiLabels.improve}</p>
                      </div>
                      <p className="text-gray-600 text-xs leading-relaxed">{translatedResult.analysis.weaknesses}</p>
                    </div>
                  )}
                </div>

                {translatedResult.analysis.subtopicsToRevise?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-4 h-4 text-purple-500" />
                      <p className="font-bold text-gray-800 text-sm">{uiLabels.revise}</p>
                    </div>
                    <div className="space-y-1.5">
                      {translatedResult.analysis.subtopicsToRevise.map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                          <div>
                            <p className="font-bold text-purple-900 text-xs">{t.title}</p>
                            <p className="text-purple-700/70 text-xs">{t.reason}</p>
                          </div>
                          <button
                            onClick={() => { onClose(); router.push(`/skill/${id}/${moduleId}/materials`); }}
                            className="w-7 h-7 flex items-center justify-center bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all shrink-0">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Questions review */}
          {questions.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">
                  {uiLabels.questions} ({currentIndex + 1}/{questions.length})
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))} disabled={currentIndex === questions.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress dots */}
              <div className="px-5 py-3 flex gap-1.5 flex-wrap border-b border-gray-50">
                {questions.map((q, idx) => {
                  let dotColor = 'bg-gray-200';
                  if (q.type !== 'open-ended') {
                    dotColor = answers[idx] === q.correctAnswerIndex ? 'bg-green-400' : 'bg-red-400';
                  } else {
                    // Check AI marking for open-ended
                    const oeMark = result.analysis?.openEndedMarking?.find((m: any) => m.questionIndex === idx);
                    if (oeMark) {
                      dotColor = oeMark.isCorrect ? 'bg-blue-400' : 'bg-red-400';
                    } else {
                      dotColor = answers[idx] ? 'bg-blue-200' : 'bg-gray-200';
                    }
                  }
                  return (
                    <button key={idx} onClick={() => setCurrentIndex(idx)}
                      className={`w-5 h-5 rounded-full transition-all ${dotColor} ${idx === currentIndex ? 'ring-2 ring-yellow-400 ring-offset-1 scale-125' : 'hover:scale-110'}`}
                      title={`Q${idx + 1}`} />
                  );
                })}
              </div>

              <div className="p-5">
                <AnimatePresence mode="wait">
                  <motion.div key={currentIndex} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        Q{currentIndex + 1} · {isMCQ ? 'Multiple Choice' : 'Open-Ended'}
                      </p>
                      {currentQ.sourceMaterial && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider rounded border border-purple-100">
                          {currentQ.sourceMaterial}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-base mb-4 leading-relaxed">{currentQ?.question}</p>

                    {isMCQ && (
                      <div className="space-y-2">
                        {currentQ.options.map((opt: string, idx: number) => {
                          const isCorrect = idx === currentQ.correctAnswerIndex;
                          const isSelected = answers[currentIndex] === idx;
                          let cls = 'border-gray-100 bg-gray-50 opacity-50';
                          let letterCls = 'bg-gray-200 text-gray-500';
                          if (isCorrect) { cls = 'border-green-400 bg-green-50'; letterCls = 'bg-green-500 text-white'; }
                          else if (isSelected) { cls = 'border-red-400 bg-red-50'; letterCls = 'bg-red-500 text-white'; }

                          return (
                            <div key={idx} className={`flex items-center p-3 rounded-xl border-2 ${cls}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mr-3 shrink-0 ${letterCls}`}>
                                {labels[idx]}
                              </div>
                              <span className="text-sm font-medium flex-grow">{opt}</span>
                              {isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 ml-2 shrink-0" />}
                              {isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600 ml-2 shrink-0" />}
                            </div>
                          );
                        })}
                        {currentQ.explanation && (
                          <div className={`mt-3 p-3 rounded-xl text-xs font-medium border ${answers[currentIndex] === currentQ.correctAnswerIndex ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                            <strong>Explanation: </strong>{currentQ.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {!isMCQ && (
                      <div className="space-y-3">
                        {answers[currentIndex] && (
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 mb-1">Your Answer</p>
                            <p className="text-sm text-gray-800 leading-relaxed">{answers[currentIndex]}</p>
                          </div>
                        )}
                        
                        {/* Open-Ended marking feedback */}
                        {(() => {
                          const oeMark = result.analysis?.openEndedMarking?.find((m: any) => m.questionIndex === currentIndex);
                          if (!oeMark) return null;
                          return (
                            <div className={`p-3 rounded-xl text-xs font-medium border ${oeMark.isCorrect ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {oeMark.isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                <strong>AI Evaluation: {oeMark.isCorrect ? 'Correct' : 'Incorrect'}</strong>
                              </div>
                              {oeMark.feedback}
                            </div>
                          );
                        })()}

                        <div className="p-3 bg-[#FEF9C3] rounded-xl border border-[#FDE68A]">
                          <p className="text-xs font-bold text-[#854D0E] mb-1">Model Answer</p>
                          <p className="text-sm text-[#854D0E] leading-relaxed">{currentQ.modelAnswer}</p>
                          {currentQ.keyPoints?.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {currentQ.keyPoints.map((kp: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-[#854D0E] text-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#CA8A04]" />{kp}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── History Content ──────────────────────────────────────────────────────────
function HistoryContent({ id, moduleId }: { id: string; moduleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [moduleTitle, setModuleTitle] = useState('');
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const supabase = createClient();

        const { data: nodeData } = await supabase
          .from('roadmap_nodes').select('title').eq('node_id', moduleId).limit(1);
        if (nodeData?.[0]) setModuleTitle(nodeData[0].title);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('user_id', user.id)
          .eq('node_id', moduleId)
          .order('created_at', { ascending: false });

        setResults(data || []);
      } catch (err) {
        console.error('History fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [moduleId]);

  if (loading) return (
    <div className="flex-grow flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
    </div>
  );

  return (
    <main className="flex-grow relative flex flex-col items-center py-8 px-4 min-h-[calc(100vh-5rem)]">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

      <div className="w-full max-w-3xl z-10">
        {/* Back button */}
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <span className="inline-block px-3 py-1 bg-[#FEF9C3] text-[#854D0E] text-xs font-bold uppercase tracking-widest rounded-full mb-3 border border-[#FDE68A]">
            Quiz History
          </span>
          <h1 className="font-display text-3xl font-bold text-gray-900 capitalize">{moduleTitle}</h1>
          <p className="text-gray-500 text-sm mt-1">{results.length} quiz{results.length !== 1 ? 'zes' : ''} completed</p>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium text-lg mb-2">No quiz history yet</p>
            <p className="text-gray-400 text-sm mb-6">Complete a quiz to see your results here.</p>
            <motion.button 
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/skill/${id}/${moduleId}/quiz/setup`)}
              className="px-6 py-3 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-full font-bold transition-all shadow-md hover:shadow-lg">
              Start Quiz
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, idx) => {
              const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Score bar */}
                  <div className="h-1.5 bg-gray-100">
                    <div
                      className={`h-full transition-all ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="p-5 flex items-center gap-4">
                    {/* Score badge */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 font-bold ${scoreColor(result.score, result.total)}`}>
                      <span className="text-lg leading-none">{result.score}</span>
                      <span className="text-xs opacity-70">/{result.total}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {result.question_type === 'multiple-choice' ? 'MCQ' : result.question_type === 'open-ended' ? 'Open-Ended' : 'Mixed'}
                        </span>
                        <span className="text-xs text-gray-400">{result.num_questions || result.questions?.length || '?'} questions</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(result.created_at)}
                      </p>
                      {result.analysis?.overallFeedback && (
                        <p className="text-gray-600 text-xs mt-1 truncate">{result.analysis.overallFeedback}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <motion.button
                        whileHover={{ y: -2, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedResult(result)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
                      >
                        Review <ChevronRight className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Retake button */}
            <div className="pt-4 flex justify-center">
              <motion.button 
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/skill/${id}/${moduleId}/quiz/setup`)}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 hover:border-[#FFD700] text-gray-700 rounded-full font-bold transition-all shadow-sm hover:shadow-md">
                <RotateCcw className="w-4 h-4" /> Take Another Quiz
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {selectedResult && (
          <ReviewModal
            result={selectedResult}
            onClose={() => setSelectedResult(null)}
            id={id}
            moduleId={moduleId}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function QuizHistoryPage({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const { id, moduleId } = use(params);
  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center"><Loader2 className="w-10 h-10 text-[#FFD700] animate-spin" /></div>}>
        <HistoryContent id={id} moduleId={moduleId} />
      </Suspense>
      <Footer />
    </div>
  );
}
