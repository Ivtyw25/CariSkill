'use client';

import React, { useState, useEffect } from 'react';
import { Play, Loader2, Video, Download, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoSummaryPlayerProps {
  textContent: string;
  nodeId?: string;
  initialVideoUrl?: string | null;
}

const BACKEND_URL = "http://localhost:8000";

export default function VideoSummaryPlayer({ textContent, nodeId, initialVideoUrl }: VideoSummaryPlayerProps) {
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>(initialVideoUrl ? 'completed' : 'idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
  const [error, setError] = useState<string | null>(null);

  // Update if initialVideoUrl changes (e.g. after successful DB fetch in parent)
  useEffect(() => {
    if (initialVideoUrl) {
      setVideoUrl(initialVideoUrl);
      setStatus('completed');
    }
  }, [initialVideoUrl]);

  const startGeneration = async () => {
    setStatus('processing');
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textContent,
          node_id: nodeId,
          session_id: "web-session-" + Math.random().toString(36).substring(7)
        }),
      });

      if (!response.ok) throw new Error("Failed to start video generation");
      const data = await response.json();
      setTaskId(data.task_id);
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'processing' && taskId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/video/status/${taskId}`);
          const data = await res.json();

          if (data.status === 'completed') {
            setVideoUrl(`${BACKEND_URL}/api/video/download/${taskId}`);
            setStatus('completed');
            clearInterval(interval);
          } else if (data.status === 'error') {
            setStatus('error');
            setError(data.message || "An error occurred during generation");
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, taskId]);

  return (
    <div className="mt-8 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-blue-500" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <h3 className="font-display text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Video className="w-7 h-7 text-purple-600" />
            AI Video Montage Summary
          </h3>
          <p className="text-gray-500 text-sm mt-2 max-w-xl">
            Let our director AI analyze your study notes and generate a cinematic 3-clip montage with a custom voiceover. Perfect for visual learners!
          </p>
        </div>

        <div className="shrink-0">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.button
                key="btn-idle"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={startGeneration}
                className="flex items-center gap-2 px-6 py-3 bg-[#18181B] text-white rounded-xl font-bold shadow-lg hover:bg-gray-800 transition-all active:scale-95"
              >
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Generate Video Summary
              </motion.button>
            )}

            {status === 'processing' && (
              <motion.div
                key="status-processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex items-center gap-3 text-purple-600 font-bold px-4 py-2 bg-purple-50 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Directing AI Video...
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">This may take 1-2 minutes</span>
              </motion.div>
            )}

            {status === 'completed' && (
              <motion.div
                key="status-completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 text-green-600 font-bold px-4 py-2 bg-green-50 rounded-lg border border-green-100"
              >
                <Play className="w-5 h-5 fill-green-600" />
                Montage Ready!
              </motion.div>
            )}
            
            {status === 'error' && (
              <motion.div
                key="status-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-end gap-2"
              >
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Failed to generate
                </div>
                <button onClick={() => setStatus('idle')} className="text-[10px] text-gray-400 underline hover:text-gray-600">Try again</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {videoUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-8 rounded-2xl overflow-hidden border-4 border-gray-900 shadow-2xl bg-black"
          >
            <video 
              controls 
              className="w-full aspect-video"
              poster="/video-placeholder.png"
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="p-4 bg-gray-900 flex justify-between items-center">
               <span className="text-white text-xs font-bold flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-yellow-400" />
                 Generated by Veo 3.1 & CariSkill
               </span>
               <a 
                 href={videoUrl} 
                 download 
                 className="flex items-center gap-2 text-white/80 hover:text-white text-xs font-bold transition-colors"
               >
                 <Download className="w-4 h-4" />
                 Save to Computer
               </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-medium">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
