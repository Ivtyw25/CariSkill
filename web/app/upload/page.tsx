'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { UserPlus, Upload, CheckCircle2, Loader2, X, Sparkles, Save } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleSave = async () => {
    if (!resumeFile) return;
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);

      // 1. Send the PDF to our new extraction API
      const response = await fetch('/api/extract-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract resume data");

      const extractedData = await response.json();

      // 2. Temporarily save the data to the browser's sessionStorage
      sessionStorage.setItem('extractedResume', JSON.stringify(extractedData));

      // 3. Redirect back to the Resume page to see the results!
      router.push('/resume');

    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex flex-col items-center justify-center py-12 px-4">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-2xl z-10">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 mb-4">Upload Your Resume</h1>
            <p className="text-gray-600 text-lg">We will use AI to extract your details and build your digital profile instantly.</p>
          </motion.div>

          {/* Upload Card */}
          <div className="mb-10">
            <div className={`bg-white rounded-3xl p-8 shadow-sm border-2 transition-all h-[360px] relative flex flex-col items-center justify-center text-center ${resumeFile ? 'border-green-400 bg-green-50/10' : 'border-dashed border-gray-300 hover:border-[#FFD700]'}`}>
              {resumeFile && !isExtracting && (
                <button onClick={() => setResumeFile(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              )}
              
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${resumeFile ? 'bg-green-100 text-green-600' : 'bg-[#FEF9C3] text-[#CA8A04]'}`}>
                {resumeFile ? <CheckCircle2 className="w-12 h-12" /> : <UserPlus className="w-12 h-12" />}
              </div>
              
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
                {resumeFile ? "Resume Ready!" : "Your Resume"}
              </h2>
              <p className="text-gray-500 mb-8">{resumeFile ? resumeFile.name : "Upload your current CV in PDF format."}</p>
              
              {!resumeFile && (
                <label className="bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 font-bold py-3.5 px-8 rounded-xl cursor-pointer shadow-md active:scale-95 transition-all text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5" /> Browse PDF
                  <input type="file" className="hidden" accept=".pdf" onChange={(e) => e.target.files?.[0] && setResumeFile(e.target.files[0])} />
                </label>
              )}
            </div>
          </div>

          {/* Save & Extract Button */}
          <div className="flex justify-center">
            <button 
              onClick={handleSave}
              disabled={!resumeFile || isExtracting}
              className={`flex items-center gap-3 px-12 py-4 rounded-2xl font-display font-bold text-xl transition-all shadow-xl
                ${(!resumeFile) ? 'bg-gray-200 text-gray-400 cursor-not-allowed hidden' : 'bg-[#18181B] hover:bg-gray-800 text-white active:scale-95'}`}
            >
              {isExtracting ? (
                <><Loader2 className="w-6 h-6 animate-spin text-[#FFD700]" /> Extracting with AI...</>
              ) : (
                <><Sparkles className="w-6 h-6 text-[#FFD700]" /> Save Profile</>
              )}
            </button>
          </div>
          
        </div>
      </main>
      <Footer />
    </div>
  );
}