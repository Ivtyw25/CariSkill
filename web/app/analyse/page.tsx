'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  FileText,
  UserPlus,
  Upload,
  BarChart,
  AlertCircle,
  AlertTriangle,
  ThumbsUp,
  Check,
  Target,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,    // <--- Ensure this is here too
  Loader2,
  X,
  Target as TargetIcon
} from 'lucide-react';

export default function AnalysePage() {
  const router = useRouter();

  // Keep your states as they were...
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleAnalyse = async () => {
    if (!jobFile || !resumeFile) return;
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('job', jobFile);

      const response = await fetch('/api/analyse', {
        method: 'POST',
        body: formData, // No headers needed, fetch sets the boundary automatically
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setAnalysisData(data);
      setShowResults(true);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setJobFile(null);
    setResumeFile(null);
    setShowResults(false);
    setAnalysisData(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col items-center py-12 px-4">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-5xl mb-12 z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Analyse Your Skill Gap</h1>
            <p className="text-gray-600 text-lg">Upload your target job description and your current resume to see what you're missing.</p>
          </motion.div>

          {/* Upload Section */}
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Job Upload Card */}
            <div className={`bg-white rounded-3xl p-8 shadow-sm border-2 transition-all h-[320px] relative flex flex-col items-center justify-center text-center ${jobFile ? 'border-green-400 bg-green-50/10' : 'border-dashed border-gray-300 hover:border-[#FFD700]'}`}>
              {jobFile && (
                <button onClick={() => { setJobFile(null); setShowResults(false); }} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${jobFile ? 'bg-green-100 text-green-600' : 'bg-[#FEF9C3] text-[#CA8A04]'}`}>
                {jobFile ? <CheckCircle2 className="w-10 h-10" /> : <FileText className="w-10 h-10" />}
              </div>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Job Advertisement</h2>
              <p className="text-gray-500 mb-6">{jobFile ? jobFile.name : "Upload the job description PDF."}</p>
              {!jobFile && (
                <label className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-3 px-8 rounded-xl cursor-pointer shadow-md active:scale-95">
                  <Upload className="w-5 h-5 inline mr-2" /> Browse PDF
                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && setJobFile(e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Resume Upload Card */}
            <div className={`bg-white rounded-3xl p-8 shadow-sm border-2 transition-all h-[320px] relative flex flex-col items-center justify-center text-center ${resumeFile ? 'border-green-400 bg-green-50/10' : 'border-dashed border-gray-300 hover:border-[#FFD700]'}`}>
              {resumeFile && (
                <button onClick={() => { setResumeFile(null); setShowResults(false); }} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${resumeFile ? 'bg-green-100 text-green-600' : 'bg-[#FEF9C3] text-[#CA8A04]'}`}>
                {resumeFile ? <CheckCircle2 className="w-10 h-10" /> : <UserPlus className="w-10 h-10" />}
              </div>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Your Resume</h2>
              <p className="text-gray-500 mb-6">{resumeFile ? resumeFile.name : "Upload your current CV PDF."}</p>
              {!resumeFile && (
                <label className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-3 px-8 rounded-xl cursor-pointer shadow-md active:scale-95">
                  <Upload className="w-5 h-5 inline mr-2" /> Browse PDF
                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && setResumeFile(e.target.files[0])} />
                </label>
              )}
            </div>
          </div>

          {!showResults && (
            <div className="flex justify-center mb-12">
              <button
                onClick={handleAnalyse}
                disabled={!jobFile || !resumeFile || isAnalyzing}
                className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-display font-bold text-xl transition-all shadow-xl
                  ${(!jobFile || !resumeFile) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#18181B] hover:bg-gray-800 text-white active:scale-95'}`}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-6 h-6 animate-spin text-[#FFD700]" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-6 h-6 text-[#FFD700]" /> Analyse Skills</>
                )}
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showResults && analysisData && (
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl z-10">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FFD700] to-[#E6C200]" />
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <BarChart className="w-7 h-7 text-[#CA8A04]" /> Analysis Results
                  </h2>
                  <button onClick={resetAnalysis} className="text-sm font-bold text-gray-500 hover:text-gray-900 underline">Start New</button>
                </div>

                {/* Score Bar */}
                <div className="mb-10 bg-gray-50/80 rounded-3xl p-6 border border-gray-100">
                  <div className="flex justify-between items-end mb-4">
                    <span className="font-display font-bold text-xl">Resume Match Score</span>
                    <span className="font-display font-bold text-4xl text-[#A16207]">{analysisData.matchPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <motion.div className="bg-[#FFD700] h-4" initial={{ width: 0 }} animate={{ width: `${analysisData.matchPercentage}%` }} transition={{ duration: 1.5 }} />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <ResultCol title="Skill Must" icon={AlertCircle} color="red" items={analysisData.mustHave} onAction={() => router.push('/setup')} />
                  <ResultCol title="Useful" icon={ThumbsUp} color="blue" items={analysisData.useful} onAction={() => router.push('/setup')} />
                  <ResultCol title="Might Need" icon={TargetIcon} color="yellow" items={analysisData.mightNeed} onAction={() => router.push('/setup')} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

function ResultCol({ title, icon: Icon, color, items, onAction }: any) {
  const styles: any = {
    red: 'bg-red-50/50 border-red-100 text-red-600',
    blue: 'bg-blue-50/50 border-blue-100 text-blue-600',
    yellow: 'bg-yellow-50/50 border-yellow-100 text-[#B45309]'
  };
  return (
    <div className={`rounded-3xl p-6 border ${styles[color]}`}>
      <div className="flex items-center gap-3 mb-6">
        <Icon className="w-6 h-6 stroke-[2.5]" />
        <h3 className="font-display font-bold text-xl text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-4">
        {items.map((skill: any) => (
          <li key={skill.id} className="block">
            <Link href="/setup" className="bg-white p-4 rounded-2xl shadow-sm border hover:border-yellow-400 cursor-pointer flex justify-between items-center transition-all group w-full text-left">
              <span className="font-bold text-gray-800">{skill.name}</span>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-yellow-600 transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}