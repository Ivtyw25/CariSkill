'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Image, Loader2, Sparkles,
  CheckCircle, Clock, AlertCircle, Trash2, Building2, Briefcase
} from 'lucide-react';

export default function TargetJobPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [completedSkills, setCompletedSkills] = useState<Set<string>>(new Set());
  const [loadingJobs, setLoadingJobs] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch saved target jobs
  useEffect(() => {
    const fetchJobs = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingJobs(false); return; }

      const [jobsRes, progressRes] = await Promise.all([
        supabase.from('target_jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('node_progress').select('node_id').eq('user_id', user.id).eq('is_completed', true),
      ]);

      setJobs(jobsRes.data || []);
      if (jobsRes.data && jobsRes.data.length > 0) setSelectedJobId(jobsRes.data[0].id);

      // Build set of completed skill-like keywords from node titles
      const completedNodeIds = new Set((progressRes.data || []).map((p: any) => p.node_id.toLowerCase().replace(/_/g, ' ')));
      setCompletedSkills(completedNodeIds);
      setLoadingJobs(false);
    };
    fetchJobs();
  }, []);

  const handleFile = async (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPG, PNG, and WebP files are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/generate/extract-job', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || !data.job) {
        throw new Error(data.error || 'Extraction failed');
      }

      setJobs(prev => [data.job, ...prev]);
      setSelectedJobId(data.job.id);
    } catch (err: any) {
      setError(err.message || 'Failed to process file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDelete = async (jobId: string) => {
    const supabase = createClient();
    await supabase.from('target_jobs').delete().eq('id', jobId);
    setJobs(prev => prev.filter(j => j.id !== jobId));
    if (selectedJobId === jobId) setSelectedJobId(jobs.find(j => j.id !== jobId)?.id || null);
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const getSkillStatus = (skill: string) => {
    const normalized = skill.toLowerCase();
    for (const completedId of completedSkills) {
      if (completedId.includes(normalized) || normalized.includes(completedId.split(' ')[0])) {
        return 'completed';
      }
    }
    return 'missing';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative flex justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div className="w-full max-w-7xl z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Sidebar />

          <section className="lg:col-span-3 space-y-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-gray-900 mb-1">Target Job</h1>
              <p className="text-gray-500">Upload a job ad to see your skill gap analysis</p>
            </div>

            {/* Upload Zone */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'border-[#FFD700] bg-[#FEF9C3]/50 scale-[1.01]' :
                  uploading ? 'border-blue-300 bg-blue-50 cursor-wait' :
                    'border-gray-200 hover:border-[#FFD700] hover:bg-[#FEF9C3]/20'
                }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {uploading ? (
                <div className="flex flex-col items-center gap-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles className="w-12 h-12 text-[#FFD700]" />
                  </motion.div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">AI is reading your job ad...</p>
                    <p className="text-sm text-gray-500 mt-1">Extracting job title, company, and required skills</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Image className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Drop your job ad here</p>
                    <p className="text-sm text-gray-500 mt-1">PDF, JPG, PNG or WebP · Max 10MB</p>
                  </div>
                  <span className="px-5 py-2 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-full font-bold text-sm transition-colors">
                    Browse File
                  </span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Saved Jobs + Skill Gap */}
            {loadingJobs ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#FFD700]" /></div>
            ) : jobs.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Job List */}
                <div className="space-y-3">
                  <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Saved Jobs</h2>
                  {jobs.map(job => (
                    <motion.div key={job.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group ${selectedJobId === job.id ? 'border-[#FFD700] bg-[#FEF9C3]/30' : 'border-gray-100 bg-white hover:border-[#FFD700]/50'
                        }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm line-clamp-2">{job.job_title}</p>
                          {job.company && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />{job.company}</p>}
                          <p className="text-xs text-gray-400 mt-1">{new Date(job.created_at).toLocaleDateString()}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Skill Gap Dashboard */}
                {selectedJob && (
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-[#FEF9C3] flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-[#CA8A04]" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-xl">{selectedJob.job_title}</h2>
                        {selectedJob.company && <p className="text-sm text-gray-500">{selectedJob.company}</p>}
                      </div>
                    </div>

                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Required Skills — Gap Analysis</h3>

                    {/* Stats */}
                    {(() => {
                      const skills: string[] = selectedJob.required_skills || [];
                      const complete = skills.filter(s => getSkillStatus(s) === 'completed').length;
                      const pct = skills.length > 0 ? Math.round((complete / skills.length) * 100) : 0;
                      return (
                        <div className="mb-5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Match score</span>
                            <span className="font-bold text-gray-900">{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                              className={`h-3 rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-[#FFD700]' : 'bg-orange-400'}`} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{complete} of {skills.length} skills matched</p>
                        </div>
                      );
                    })()}

                    <div className="flex flex-wrap gap-2">
                      {(selectedJob.required_skills || []).map((skill: string, idx: number) => {
                        const status = getSkillStatus(skill);
                        return (
                          <span key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${status === 'completed'
                              ? 'bg-green-50 border-green-200 text-green-800'
                              : 'bg-orange-50 border-orange-200 text-orange-800'
                            }`}>
                            {status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {skill}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />In your roadmaps</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-400" />Not yet started</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                <p className="font-bold text-gray-500">No jobs saved yet</p>
                <p className="text-sm mt-1">Upload your first job ad to see the skill gap analysis</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}