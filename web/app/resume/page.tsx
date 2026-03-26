'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { Upload, Printer, MapPin, Mail, Phone, Loader2, Sparkles, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { motion } from 'framer-motion';

export default function ResumePage() {
  const router = useRouter();

  // State to hold the resume data or null for empty state
  const [data, setData] = useState<any>(undefined);
  const [loading, setLoading] = useState(true);

  // On page load, fetch from DB or Session
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileDb, error } = await supabase
          .from('profiles')
          .select('resume_data')
          .eq('id', user.id)
          .maybeSingle();

        if (profileDb && profileDb.resume_data) {
          setData(profileDb.resume_data);
        } else {
          setData(null); // Explicit Empty State
        }
      } catch (e) {
        console.error("Resume Fetch Error", e);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    // Fast cache check if we literally just uploaded
    const savedData = sessionStorage.getItem('extractedResume');
    if (savedData) {
      setData(JSON.parse(savedData));
      setLoading(false);
      sessionStorage.removeItem('extractedResume'); // Consume it
    } else {
      fetchResume();
    }
  }, [router]);

  // Trigger the browser's native print dialog
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
        <Loader2 className="w-10 h-10 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900 print:bg-white">
      {/* Hide Navbar during printing */}
      <div className="print:hidden">
        <Navbar isLoggedIn={true} />
      </div>

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8 print:p-0">
        {/* Hide Background Pattern during printing */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px] print:hidden" />

        <div className="w-full max-w-7xl z-10 grid grid-cols-1 lg:grid-cols-4 gap-8 print:block print:w-full print:max-w-none">

          {/* Hide Sidebar during printing */}
          <div className="lg:col-span-1 print:hidden">
            <Sidebar />
          </div>

          <div className="lg:col-span-3 print:col-span-4 flex flex-col h-full space-y-6 print:space-y-0">

            {/* Empty State */}
            {!data ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="bg-white rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center p-12 min-h-[600px] relative overflow-hidden"
              >
                {/* Background glow for empty state */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-400/5 blur-[120px] rounded-full pointer-events-none" />
                
                <motion.div 
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
                  className="w-24 h-24 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-yellow-100 relative z-10"
                >
                  <FileText className="w-12 h-12 text-yellow-500" />
                </motion.div>
                
                <h2 className="font-display text-4xl font-bold text-gray-900 mb-4 relative z-10">No Resume Found</h2>
                <p className="text-gray-500 max-w-md mb-10 leading-relaxed text-lg relative z-10">
                  Upload your CV to let our AI instantly analyze your skills, build your digital profile, and recommend custom learning roadmaps!
                </p>
                
                <Link
                  href="/upload"
                  className="relative group z-10"
                >
                  {/* Glowing Outline effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-300 via-yellow-400 to-[#FFD700] rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse"></div>
                  
                  {/* Button Content */}
                  <button className="relative bg-[#FFD700] text-gray-900 font-bold h-14 px-10 rounded-xl shadow-lg flex items-center gap-3 transition-transform duration-300 transform group-hover:-translate-y-1 group-active:translate-y-0 group-active:scale-95 text-lg">
                    <Sparkles className="w-5 h-5 text-yellow-700" />
                    Analyse Resume
                  </button>
                </Link>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Action Buttons (Hidden on Print) */}
                <div className="flex items-center gap-4 print:hidden">
                  <Link
                    href="/upload"
                    className="relative group"
                  >
                    {/* Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-300 via-yellow-400 to-[#FFD700] rounded-xl blur opacity-0 group-hover:opacity-60 transition duration-500 group-hover:duration-200" />
                    <button className="relative bg-[#FFD700] text-gray-900 font-bold h-14 px-8 rounded-xl shadow-md flex items-center gap-3 transition-transform duration-300 group-hover:-translate-y-1 group-active:scale-95 text-lg">
                      <Upload className="w-6 h-6 stroke-[2.5]" />
                      Upload New
                    </button>
                  </Link>
                  <div className="relative group">
                    {/* Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-400 rounded-xl blur opacity-0 group-hover:opacity-40 transition duration-500 group-hover:duration-200" />
                    <button
                      onClick={handlePrint}
                      className="relative bg-white hover:bg-gray-50 text-gray-700 font-semibold h-14 w-14 rounded-xl shadow-sm border border-gray-200 flex items-center justify-center transition-transform duration-300 transform group-hover:-translate-y-1 group-active:scale-95"
                      title="Print Resume"
                    >
                      <Printer className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Resume Document */}
                <div className="bg-white rounded-3xl p-8 lg:p-12 border border-gray-100 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03),0_10px_15px_-3px_rgba(0,0,0,0.05)] print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 min-h-[800px]">

                  {/* Header */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-col md:flex-row justify-between items-start mb-10 border-b border-gray-100 pb-8"
                  >
                    <div className="mb-4 md:mb-0">
                      <h1 className="font-display font-bold text-4xl text-gray-900 mb-2">{data.name}</h1>
                      <p className="text-xl text-gray-500 font-medium">{data.title}</p>
                    </div>
                    <div className="md:text-right space-y-2 text-gray-500 text-sm">
                      <p className="flex items-center md:justify-end gap-2"><MapPin className="w-4 h-4" /> {data.location}</p>
                      {data.email && <p className="flex items-center md:justify-end gap-2"><Mail className="w-4 h-4" /> {data.email}</p>}
                      {data.phone && <p className="flex items-center md:justify-end gap-2"><Phone className="w-4 h-4" /> {data.phone}</p>}
                    </div>
                  </motion.div>

                  {/* Summary */}
                  {data.summary && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="mb-10"
                    >
                      <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-4 border-l-4 border-[#FFD700] pl-3">Summary</h3>
                      <p className="text-gray-600 leading-relaxed">
                        {data.summary}
                      </p>
                    </motion.div>
                  )}

                  {/* Experience */}
                  {data.experience && data.experience.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="mb-10"
                    >
                      <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Experience</h3>
                      <div className="space-y-8">
                        {data.experience.map((job: any, idx: number) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 + idx * 0.08 }}
                            className="relative pl-6 border-l border-gray-200"
                          >
                            <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${job.isPrimary ? 'bg-[#FFD700] shadow-sm' : 'bg-gray-300'}`}></div>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-baseline mb-2">
                              <h4 className="font-bold text-gray-900 text-lg">{job.role}</h4>
                              <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full mt-2 sm:mt-0">{job.period}</span>
                            </div>
                            <p className={`font-medium mb-2 ${job.isPrimary ? 'text-[#CA8A04]' : 'text-gray-700'}`}>{job.company}</p>
                            {job.achievements && job.achievements.length > 0 && (
                              <ul className="list-disc list-outside ml-4 text-gray-600 space-y-1">
                                {job.achievements.map((item: string, i: number) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Projects */}
                  {data.projects && data.projects.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.45 }}
                      className="mb-10"
                    >
                      <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Projects</h3>
                      <div className="space-y-6">
                        {data.projects.map((project: any, idx: number) => (
                          <div key={idx}>
                            <h4 className="font-bold text-gray-900">{project.name}</h4>
                            <p className="text-gray-600 text-sm mt-1">{project.description}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Two Column Section for Education & Skills */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    {data.education && data.education.length > 0 && (
                      <div>
                        <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Education</h3>
                        <div className="space-y-6">
                          {data.education.map((edu: any, idx: number) => (
                            <div key={idx}>
                              <h4 className="font-bold text-gray-900">{edu.degree}</h4>
                              <p className="text-gray-500 text-sm">{edu.school} {edu.period ? `• ${edu.period}` : ''}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.skills && data.skills.length > 0 && (
                      <div>
                        <h3 className="font-display font-bold text-lg text-gray-900 uppercase tracking-wider mb-6 border-l-4 border-[#FFD700] pl-3">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {data.skills.map((skill: string, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 bg-yellow-50 text-gray-800 rounded-lg text-sm font-medium border border-yellow-100">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>

                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Hide Footer during printing */}
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}