'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FileText, Upload, CheckCircle2, Loader2, X, Sparkles, Briefcase } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AddTargetJobPage() {
  const router = useRouter();
  const supabase = createClient();
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleSaveAndAnalyze = async () => {
    if (!jobFile) return;
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append('job', jobFile);

      // Hit the dedicated extraction API route
      const response = await fetch('/api/extract-job', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract job data");

      const extractedData = await response.json();

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      // Save to Supabase target_jobs table
      const { data: insertedData, error: dbError } = await supabase
        .from('target_jobs')
        .insert({
          user_id: user.id,
          title: extractedData.detail.title,
          company: extractedData.detail.company,
          location: extractedData.detail.location,
          salary: extractedData.detail.salary,
          color_theme: extractedData.detail.theme,
          stats: extractedData.detail.stats,
          skills_have: extractedData.detail.skillsHave,
          skills_acquire: extractedData.detail.skillsAcquire,
          original_ad: extractedData.ad
        })
        .select('id')
        .single();

      if (dbError) throw new Error(`Database Error: ${dbError.message}`);

      // Redirect directly to the dynamic Job Detail page using the real UUID
      router.push(`/target-job/${insertedData.id}`);

    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col items-center justify-center py-12 px-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-2xl z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Add a Target Job</h1>
            <p className="text-gray-600 text-lg">Upload a job description PDF. We will use your saved resume to analyze your fit instantly.</p>
          </motion.div>

          {/* Upload Card */}
          <div className="mb-10">
            <div className={`bg-white rounded-3xl p-8 shadow-sm border-2 transition-all h-[360px] relative flex flex-col items-center justify-center text-center max-w-md mx-auto ${jobFile ? 'border-blue-400 bg-blue-50/10' : 'border-dashed border-gray-300 hover:border-[#FFD700]'}`}>
              {jobFile && !isExtracting && (
                <button onClick={() => setJobFile(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              )}

              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${jobFile ? 'bg-blue-100 text-blue-600' : 'bg-[#FEF9C3] text-[#CA8A04]'}`}>
                {jobFile ? <CheckCircle2 className="w-12 h-12" /> : <Briefcase className="w-12 h-12" />}
              </div>

              <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
                {jobFile ? "Ready to Analyze!" : "Job Advertisement"}
              </h2>
              <p className="text-gray-500 mb-8 px-4">{jobFile ? jobFile.name : "Upload the job description in PDF format."}</p>

              {!jobFile && (
                <label className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-3.5 px-8 rounded-xl cursor-pointer shadow-md active:scale-95 transition-all text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5 stroke-[2.5]" /> Browse PDF
                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && setJobFile(e.target.files[0])} />
                </label>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSaveAndAnalyze}
              disabled={!jobFile || isExtracting}
              className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-display font-bold text-xl transition-all shadow-xl
                ${(!jobFile) ? 'bg-gray-200 text-gray-400 cursor-not-allowed hidden' : 'bg-[#18181B] hover:bg-gray-800 text-white active:scale-95'}`}
            >
              {isExtracting ? (
                <><Loader2 className="w-6 h-6 animate-spin text-[#FFD700]" /> Analyzing Fit...</>
              ) : (
                <><Sparkles className="w-6 h-6 text-[#FFD700]" /> Add & Analyze</>
              )}
            </button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}