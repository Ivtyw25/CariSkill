'use client';

import { use, useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, Download, Sparkles, CheckCircle2, Play, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createClient } from '@/utils/supabase/client';
import BookmarkButton from '@/components/BookmarkButton';

export default function SummaryPage({ params }: { params: Promise<{ id: string, moduleId: string }> }) {
  const { id, moduleId } = use(params);
  const router = useRouter();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const [moduleTitle, setModuleTitle] = useState('Summary');
  const [microTopics, setMicroTopics] = useState<any[]>([]);
  const [topicIndex, setTopicIndex] = useState(0);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const supabase = createClient();
        const { data: nodeData } = await supabase.from('roadmap_nodes').select('title').eq('node_id', moduleId).limit(1);
        if (nodeData && nodeData.length > 0) setModuleTitle(nodeData[0].title);

        const { data: topicsData } = await supabase
          .from('micro_topics_contents')
          .select('id, content')
          .eq('macro_node_id', moduleId)
          .order('id', { ascending: true });

        if (topicsData && topicsData.length > 0) {
          const parsed = topicsData.map(t => ({
            rowId: t.id,
            ...(typeof t.content === 'string' ? JSON.parse(t.content) : t.content),
          })).filter(Boolean);
          setMicroTopics(parsed);
        }
      } catch (err) {
        console.error('Error fetching summary topics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [moduleId]);

  const handleDownload = async () => {
    if (!pdfRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#FFFDF6',
        onclone: (clonedDoc) => {
          const allElements = clonedDoc.getElementsByTagName("*");
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            const styles = window.getComputedStyle(el);
            for (let j = 0; j < styles.length; j++) {
              const prop = styles[j];
              const value = styles.getPropertyValue(prop);
              if (value && /(oklch|oklab|lch|lab)\(/i.test(value)) {
                if (prop.includes("shadow") || prop.includes("ring")) el.style.setProperty(prop, "none", "important");
                else if (prop.includes("background")) el.style.setProperty(prop, "#ffffff", "important");
                else if (prop.includes("color")) el.style.setProperty(prop, "#374151", "important");
                else el.style.setProperty(prop, "transparent", "important");
              }
            }
            el.style.setProperty("--tw-shadow", "none", "important");
            el.style.setProperty("--tw-ring-color", "transparent", "important");
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${moduleTitle.replace(/\s+/g, '_')}_Summary.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFFDF6]">
      <Loader2 className="w-12 h-12 text-[#FFD700] animate-spin" />
    </div>
  );

  const currentTopic = microTopics[topicIndex];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF6] font-sans text-gray-900">
      <Navbar isLoggedIn={true} />

      <main className="flex-grow relative overflow-hidden flex flex-col items-center py-10">
        <div data-html2canvas-ignore="true" className="absolute inset-0 pointer-events-none z-0 opacity-30 bg-[radial-gradient(#FDE68A_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        <div ref={pdfRef} id="pdf-content" className="w-full max-w-5xl px-8 z-10">

          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded">
                  {moduleId.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 capitalize">
                {currentTopic?.topic_title || moduleTitle}
              </h1>
            </div>

            <div className="flex items-center gap-3" data-html2canvas-ignore="true">
              <BookmarkButton
                roadmapId={id}
                moduleId={moduleId}
                type="summary"
                title={`${moduleTitle} - Summary`}
                className="w-10 h-10 flex items-center justify-center !rounded-lg"
              />
              <button onClick={handleDownload} disabled={isDownloading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FFD700] hover:bg-[#E6C200] disabled:bg-gray-300 text-gray-900 rounded-lg shadow-md font-bold text-sm">
                <AnimatePresence mode="wait">
                  {isDownloading ? (
                    <motion.div key="loading" className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </motion.div>
                  ) : (
                    <motion.div key="idle" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* Sub-topic tabs */}
          {microTopics.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6" data-html2canvas-ignore="true">
              {microTopics.map((t, idx) => (
                <button key={idx} onClick={() => setTopicIndex(idx)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${topicIndex === idx ? 'bg-[#FFD700] text-gray-900' : 'bg-white border border-gray-200 text-gray-500 hover:border-[#FFD700]'}`}>
                  {t.topic_title || `Sub-topic ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          {/* Main Content Card */}
          {currentTopic ? (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-10">
              <div className="bg-[#F9FAFB] border-b border-gray-100 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#A16207] font-bold uppercase tracking-wide text-sm">
                  <Sparkles className="w-4 h-4" />
                  AI-Generated Summary Notes
                </div>
                <div className={`text-xs px-2 py-1 rounded font-bold ${currentTopic.difficulty === 'hard' ? 'bg-red-100 text-red-700' : currentTopic.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {currentTopic.difficulty || 'Study'}
                </div>
              </div>

              <div className="p-8 md:p-12 space-y-12 bg-white">
                {currentTopic.theory_explanation ? (
                  <>
                    <section>
                      <SectionHeader title="Theory & Explanation" />
                      <div className="mt-6 text-gray-700 leading-relaxed text-[17px] space-y-4">
                        {currentTopic.theory_explanation.split('\n').map((line: string, i: number) => {
                          if (!line.trim()) return null;
                          const formattedLine = line
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/`([^`]+)`/g, '<code style="background-color: rgba(243, 244, 246, 0.5); color: #db2777; padding: 2px 6px; border-radius: 4px; font-size: 14px;">$1</code>')
                            .replace(/\*   /g, '• ');
                          return <p key={i} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
                        })}
                      </div>
                    </section>

                    {currentTopic.resources && currentTopic.resources.length > 0 && (
                      <section>
                        <SectionHeader title="Learning Resources" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                          {currentTopic.resources.map((res: any, i: number) => (
                            <a key={i} href={res.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 bg-[#FAFAFA] hover:bg-white hover:shadow-md hover:border-[#FFD700] transition-all group">
                              <div className="w-12 h-12 shrink-0 rounded-xl bg-[#FEF9C3] text-[#CA8A04] flex items-center justify-center">
                                {res.type === 'youtube' ? <Play className="w-6 h-6 ml-0.5" /> : <Bookmark className="w-6 h-6" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 group-hover:text-[#CA8A04] transition-colors mb-1 line-clamp-2">{res.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                  <span className="capitalize">{res.type}</span>
                                  {res.estimated_time_minutes && <><span>•</span><span>{res.estimated_time_minutes} mins</span></>}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                    <p>No summary content available for this sub-topic.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">No topics found for this module.</p>
              <button onClick={() => router.push(`/skill/${id}`)} className="mt-4 px-6 py-2 bg-[#FFD700] rounded-xl font-bold">Return to Roadmap</button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-8 bg-[#FFD700] rounded-full" />
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}