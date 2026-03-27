'use client';

import { use, useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy, ThumbsUp, CheckCircle2, AlertTriangle, BookOpen,
  ArrowRight, RotateCcw, ChevronRight, Loader2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useSkillLanguage } from '@/components/SkillLanguageProvider';

export default function QuizResultPage({ params }: { params: Promise<{ id: string; moduleId: string; resultId: string }> }) {
  const { id, moduleId, resultId } = use(params);
  const router = useRouter();
  const { currentLanguage, translateText } = useSkillLanguage();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  
  // Translated UI Labels
  const [labels, setLabels] = useState<any>({
    analysisReview: 'AI Analysis & Performance Review',
    finalScore: 'Final Score',
    strengths: 'Strengths',
    improve: 'Areas to Improve',
    revise: 'Topics to Revise',
    takeAnother: 'Take Another Quiz',
    viewHistory: 'View History',
    moduleSummary: 'Module Summary'
  });

  const [translatedAnalysis, setTranslatedAnalysis] = useState<any>(null);
  const [translatedModuleTitle, setTranslatedModuleTitle] = useState('');
  const [scoreMessage, setScoreMessage] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('id', resultId)
          .single();
        
        if (data) {
          setResult(data);
          const rawTitle = data.node_title || 'Quiz Results';
          setModuleTitle(rawTitle);

          // Initial Score Message
          const s = data.score;
          const t = data.total;
          const rawMessage = s >= t ? 'Perfect!' : s >= t * 0.7 ? 'Great job!' : s >= t * 0.5 ? 'Keep it up!' : 'Time to review!';
          setScoreMessage(rawMessage);

          // Handle Translations
          if (currentLanguage !== 'en') {
            // Translate Module Title
            const tTitle = await translateText(rawTitle, currentLanguage);
            setTranslatedModuleTitle(tTitle);

            // Translate Labels
            const labelKeys = Object.keys(labels);
            const labelValues = Object.values(labels) as string[];
            const tLabelsList = await translateText(labelValues, currentLanguage);
            const newLabels = { ...labels };
            labelKeys.forEach((key, i) => { newLabels[key] = tLabelsList[i]; });
            setLabels(newLabels);

            // Translate Score Message
            const tMsg = await translateText(rawMessage, currentLanguage);
            setScoreMessage(tMsg);

            // Translate Analysis
            if (data.analysis) {
               const analysisToTranslate = [
                 data.analysis.overallFeedback,
                 data.analysis.strengths,
                 data.analysis.weaknesses,
                 ...(data.analysis.subtopicsToRevise?.map((st: any) => st.title) || []),
                 ...(data.analysis.subtopicsToRevise?.map((st: any) => st.reason) || [])
               ].filter(Boolean);

               const tAnalysisList = await translateText(analysisToTranslate, currentLanguage);
               
               let ptr = 0;
               const newAnalysis = JSON.parse(JSON.stringify(data.analysis));
               newAnalysis.overallFeedback = tAnalysisList[ptr++];
               newAnalysis.strengths = tAnalysisList[ptr++];
               newAnalysis.weaknesses = tAnalysisList[ptr++];
               
               if (newAnalysis.subtopicsToRevise) {
                 newAnalysis.subtopicsToRevise.forEach((st: any) => {
                   st.title = tAnalysisList[ptr++];
                 });
                 newAnalysis.subtopicsToRevise.forEach((st: any) => {
                   st.reason = tAnalysisList[ptr++];
                 });
               }
               setTranslatedAnalysis(newAnalysis);
            }
          } else {
            setTranslatedModuleTitle(rawTitle);
            setTranslatedAnalysis(data.analysis);
          }
        }
      } catch (err) {
        console.error("Error fetching result:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId, currentLanguage]);

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6]">
      <Navbar isLoggedIn={true} />
      <div className="flex-grow flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
      </div>
      <Footer />
    </div>
  );

  if (!result) return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6]">
      <Navbar isLoggedIn={true} />
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Result Not Found</h2>
        <button onClick={() => router.push(`/skill/${id}`)} className="px-6 py-2 bg-[#FFD700] rounded-xl font-bold">Return to Roadmap</button>
      </div>
      <Footer />
    </div>
  );

  const { score, total } = result;
  const analysis = translatedAnalysis;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />
      
      <main className="flex-grow relative flex flex-col items-center py-12 px-4 h-full">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
 
        <div className="text-center z-10 mb-8 max-w-3xl w-full">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 capitalize mb-2">{translatedModuleTitle}</h1>
          <p className="text-gray-500 font-medium">{labels.analysisReview}</p>
        </div>
 
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-3xl z-10"
        >
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-[#FFD700] to-[#E6C200] px-8 py-6 flex items-center justify-between">
              <div>
                <p className="text-gray-900/70 font-medium text-sm uppercase tracking-wide">{labels.finalScore}</p>
                <h2 className="font-display text-4xl font-bold text-gray-900 mt-1">
                  {score} / {total}
                </h2>
                <p className="text-gray-900/80 font-medium mt-1">
                  {scoreMessage}
                </p>
              </div>
              <Trophy className="w-16 h-16 text-gray-900/20" />
            </div>
 
            {analysis ? (
              <div className="p-8 space-y-8">
                <div className="flex items-start gap-4 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                  <ThumbsUp className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-blue-800 font-medium text-base leading-relaxed">{analysis.overallFeedback}</p>
                </div>
 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      <h3 className="font-bold text-gray-900 text-lg">{labels.strengths}</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed pl-8 border-l-2 border-green-50">
                      {analysis.strengths}
                    </p>
                  </div>
 
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-6 h-6 text-amber-500" />
                      <h3 className="font-bold text-gray-900 text-lg">{labels.improve}</h3>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed pl-8 border-l-2 border-amber-50">
                      {analysis.weaknesses}
                    </p>
                  </div>
                </div>
 
                {analysis.subtopicsToRevise?.length > 0 && (
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-6 h-6 text-purple-500" />
                      <h3 className="font-bold text-gray-900 text-lg">{labels.revise}</h3>
                    </div>
                    <div className="space-y-3 pl-8">
                      {analysis.subtopicsToRevise.map((topic: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100 group transition-all hover:bg-white hover:shadow-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-purple-900 text-sm">{topic.title}</p>
                            <p className="text-purple-700/70 text-xs mt-1 leading-relaxed">{topic.reason}</p>
                          </div>
                          <button
                            onClick={() => router.push(`/skill/${id}/${moduleId}/materials`)}
                            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all active:scale-95 shadow-sm"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin opacity-20" />
                <p>AI Analysis is unavailable for this result.</p>
              </div>
            )}
          </div>
 
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => router.push(`/skill/${id}/${moduleId}/quiz/setup`)}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-bold shadow-sm hover:border-gray-300 transition-all active:scale-95"
            >
              <RotateCcw className="w-5 h-5" /> {labels.takeAnother}
            </button>
            <button
              onClick={() => router.push(`/skill/${id}/${moduleId}/quiz/history`)}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-yellow-300 text-yellow-700 rounded-2xl font-bold shadow-sm hover:bg-yellow-50 transition-all active:scale-95"
            >
              {labels.viewHistory}
            </button>
            <button
              onClick={() => router.push(`/skill/${id}/${moduleId}/summary`)}
              className="flex items-center gap-2 px-8 py-3.5 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
            >
              {labels.moduleSummary} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
