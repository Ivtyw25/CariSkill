'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, RefreshCw, ChevronRight, Loader2, BookOpen, Star, AlertCircle } from 'lucide-react';

interface ReviewModule {
  nodeId: string;
  nodeTitle: string;
  skillTitle: string;
  roadmapId: string;
  completedAt: string;
  daysAgo: number;
}

interface ReviewQuestion {
  nodeId: string;
  roadmapId: string;
  nodeTitle: string;
  skillTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface ModuleScore {
  nodeId: string;
  nodeTitle: string;
  skillTitle: string;
  correct: number;
  total: number;
}

interface DailyReviewDropdownProps {
  initialFact: any;
  initialDueCount: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function DailyReviewDropdown({ initialFact, initialDueCount, onClose, onRefresh }: DailyReviewDropdownProps) {
  const [view, setView] = useState<'summary' | 'quiz' | 'results'>('summary');
  const [dueModules, setDueModules] = useState<ReviewModule[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [scores, setScores] = useState<Record<string, ModuleScore>>({});
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // Fetch modules when user wants to start
  const handleStart = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const REVIEWS = [1, 3, 7, 13];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allDue: ReviewModule[] = [];

      for (const offset of REVIEWS) {
        const start = new Date(today);
        start.setDate(today.getDate() - offset);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);

        const { data } = await supabase
          .from('node_progress')
          .select('node_id, roadmap_id, completed_at')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('completed_at', start.toISOString())
          .lt('completed_at', end.toISOString());

        if (data) {
          for (const row of data) {
            const { data: nodeData } = await supabase.from('roadmap_nodes').select('title').eq('node_id', row.node_id).single();
            const { data: roadmapData } = await supabase.from('roadmaps').select('topic').eq('id', row.roadmap_id).single();
            
            allDue.push({
              nodeId: row.node_id,
              nodeTitle: nodeData?.title || 'Unknown',
              skillTitle: roadmapData?.topic || 'Unknown',
              roadmapId: row.roadmap_id,
              completedAt: row.completed_at,
              daysAgo: offset
            });
          }
        }
      }

      if (allDue.length === 0) {
          setView('summary');
          return;
      }

      // Generate Quiz
      const res = await fetch('/api/generate/daily-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: allDue })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      setQuestions(data.questions.sort(() => Math.random() - 0.5));
      setDueModules(allDue);
      
      // Init scores
      const initialScores: Record<string, ModuleScore> = {};
      for (const q of data.questions) {
        if (!initialScores[q.nodeId]) {
          initialScores[q.nodeId] = {
            nodeId: q.nodeId,
            nodeTitle: q.nodeTitle,
            skillTitle: q.skillTitle,
            correct: 0,
            total: 0,
          };
        }
      }
      setScores(initialScores);
      setView('quiz');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    setIsAnswered(true);

    const q = questions[currentIdx];
    const isCorrect = idx === q.correctIndex;

    setScores(prev => ({
      ...prev,
      [q.nodeId]: {
        ...prev[q.nodeId],
        correct: prev[q.nodeId].correct + (isCorrect ? 1 : 0),
        total: prev[q.nodeId].total + 1,
      }
    }));

    if (isCorrect) setStreak(s => s + 1);
    else setStreak(0);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      saveResults();
      if (onRefresh) onRefresh();
      setView('results');
    }
  };

  const saveResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = Object.values(scores).map(s => ({
        user_id: user.id,
        roadmap_id: dueModules.find(m => m.nodeId === s.nodeId)?.roadmapId || '',
        node_id: s.nodeId,
        node_title: s.nodeTitle,
        skill_title: s.skillTitle,
        score: s.correct,
        total: s.total,
      }));

      await supabase.from('daily_review_results').insert(rows);
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const totalCorrect = Object.values(scores).reduce((a, s) => a + s.correct, 0);
  const totalQuestions = Object.values(scores).reduce((a, s) => a + s.total, 0);

  // === RENDER VIEWS ===
  
  if (view === 'summary') {
    return (
      <div className="w-80 overflow-hidden">
        {/* Achievements-style Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
            <p className="text-sm font-bold text-gray-900">Daily Review</p>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">7-3-2-1</span>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Fact Snippet with Glow */}
          <div className="bg-yellow-50/50 rounded-2xl p-4 border border-yellow-200/50 shadow-[0_8px_30px_-10px_rgba(255,215,0,0.2)] hover:shadow-[0_8px_30px_-5px_rgba(255,215,0,0.4)] transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400 opacity-[0.03] blur-2xl rounded-full -mr-10 -mt-10 group-hover:opacity-[0.08] transition-all" />
            <div className="flex items-start gap-3 relative z-10">
              <span className="text-2xl leading-none mt-0.5 filter drop-shadow-sm">{initialFact?.emoji || '🧠'}</span>
              <div>
                <p className="text-[10px] font-black text-yellow-700 uppercase tracking-tighter mb-1 opacity-70">Learning Insight</p>
                <p className="text-xs text-gray-800 font-bold leading-relaxed italic">
                  "{initialFact?.fact_text || 'Active recall is the fastest way to master a new skill.'}"
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <div className={`w-2 h-2 rounded-full ${initialDueCount > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span>{initialDueCount > 0 ? `${initialDueCount} Modules for review` : 'Pulse Check: 100%'}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-[10px] flex items-center gap-2 border border-red-100">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button 
            disabled={isGenerating || initialDueCount === 0}
            onClick={handleStart}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> Preparing session...</>
            ) : (
              <>{initialDueCount > 0 ? 'Start Review Session' : 'Nothing Due Today'}</>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'quiz' && questions[currentIdx]) {
    const q = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;
    
    return (
      <div className="w-[340px] overflow-hidden">
        {/* Achievements-style Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-yellow-50/10">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-yellow-500 fill-current animate-pulse" />
            <p className="text-[11px] font-bold text-gray-900">Session in progress...</p>
          </div>
          <div className="flex items-center gap-2">
            {streak >= 2 && <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">🔥 {streak} Streak!</span>}
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{currentIdx + 1}/{questions.length}</span>
          </div>
        </div>

        <div className="w-full bg-gray-100 h-1 overflow-hidden">
            <motion.div className="bg-yellow-400 h-full" animate={{ width: `${progress}%` }} />
         </div>

         <div className="p-5 space-y-5">
            <div>
              <p className="text-[10px] font-bold text-yellow-600 mb-1.5 uppercase tracking-wide truncate">{q.skillTitle} › {q.nodeTitle}</p>
              <p className="text-sm font-bold text-gray-900 leading-relaxed">{q.question}</p>
            </div>
  
            <div className="space-y-2.5">
               {q.options.map((opt, i) => {
                 const checked = isAnswered && i === selectedAnswer;
                 const correct = isAnswered && i === q.correctIndex;
                 let btnClass = "bg-white border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/30 hover:translate-x-1";
                 if (isAnswered) {
                   if (correct) btnClass = "bg-green-50 border-green-200 text-green-700 font-bold";
                   else if (checked) btnClass = "bg-red-50 border-red-200 text-red-700 font-bold";
                   else btnClass = "bg-gray-50 border-gray-100 opacity-60";
                 }
  
                 return (
                   <button
                     key={i}
                     disabled={isAnswered}
                     onClick={() => handleAnswer(i)}
                     className={`w-full text-left p-3.5 rounded-xl border-2 text-[11px] font-semibold transition-all flex items-center gap-3.5 shadow-sm active:scale-95 ${btnClass}`}
                   >
                     <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0
                       ${correct ? 'bg-green-500 text-white' : checked ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-yellow-200'}`}>
                       {String.fromCharCode(64 + (i + 1))}
                     </span>
                     <span className="flex-1">{opt}</span>
                   </button>
                 );
               })}
            </div>
  
            {isAnswered && (
              <button 
                onClick={handleNext}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-gray-800 transition-all active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Session'} <ChevronRight size={16} />
              </button>
            )}
         </div>
      </div>
    );
  }

  if (view === 'results') {
    const pct = Math.round((totalCorrect / totalQuestions) * 100);
    return (
      <div className="w-80 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-yellow-50/30">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <p className="text-sm font-bold text-gray-900">Review Summary</p>
          </div>
          <span className="text-[10px] font-black text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{pct}%</span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {Object.values(scores).map((s, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-900 truncate">{s.nodeTitle}</p>
                <p className="text-[10px] text-gray-500 truncate">{s.skillTitle}</p>
                <p className="text-[10px] font-black text-yellow-600 mt-0.5">{s.correct}/{s.total} Correct</p>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full mt-2 ${s.correct === s.total ? 'bg-green-500' : 'bg-yellow-400'}`} />
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-100">
           <button 
            onClick={onClose}
            className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-all active:scale-95"
          >
            Great Work!
          </button>
        </div>
      </div>
    );
  }

  return null;
}
