'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, Headphones, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PodcastPlayerProps {
  content: string;
  title?: string;
}

type GenerationStatus = 'idle' | 'requesting' | 'processing' | 'completed' | 'error';

export default function PodcastPlayer({ content, title = "Module Summary" }: PodcastPlayerProps) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const WORKER_URL = process.env.NEXT_PUBLIC_AI_WORKER_URL || 'http://localhost:8000';

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const startGeneration = async () => {
    try {
      setStatus('requesting');
      setError(null);

      const response = await fetch(`${WORKER_URL}/api/podcast/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: content,
          session_id: `web-session-${Date.now()}`,
          topic: title
        }),
      });

      if (!response.ok) throw new Error('Failed to start podcast generation');

      const data = await response.json();
      setTaskId(data.task_id);
      setStatus('processing');
      startPolling(data.task_id);
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const startPolling = (id: string) => {
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${WORKER_URL}/api/podcast/status/${id}`);
        if (!response.ok) throw new Error('Failed to check status');
        
        const data = await response.json();
        
        if (data.status === 'completed') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setAudioUrl(`${WORKER_URL}/api/podcast/download/${id}`);
          setStatus('completed');
        } else if (data.status === 'error') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setError(data.message || 'Generation failed');
          setStatus('error');
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Headphones size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">AI Audio Summary</h3>
            <p className="text-xs text-gray-500">Convert this module into a conversational podcast</p>
          </div>
        </div>
        
        {status === 'idle' && (
          <button
            onClick={startGeneration}
            className="px-4 py-2 bg-primary text-gray-900 rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Play size={16} fill="currentColor" /> Generate
          </button>
        )}
      </div>

      {status === 'requesting' && (
        <div className="flex items-center gap-3 py-4 text-gray-600 dark:text-gray-400">
          <Loader2 className="animate-spin text-primary" />
          <span className="text-sm font-medium">Contacting AI Audio Studio...</span>
        </div>
      )}

      {status === 'processing' && (
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400 animate-pulse">Synthesizing audio nodes...</span>
            <span className="text-primary font-mono text-xs italic">ETA: ~1-2 mins</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full transition-all duration-1000 ease-linear animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      )}

      {status === 'completed' && audioUrl && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 size={14} /> Podcast Ready
          </div>
          <audio controls className="w-full h-10">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <div className="flex justify-end">
            <a 
              href={audioUrl} 
              download={`Podcast_${title.replace(/\s+/g, '_')}.mp3`}
              className="text-xs text-gray-500 hover:text-primary flex items-center gap-1 underline transition-colors"
            >
              <Download size={12} /> Save MP3
            </a>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-red-500 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800 dark:text-red-200">Generation Failed</p>
            <p className="text-xs text-red-600 dark:text-red-400">{error || 'Please ensure FFmpeg is installed on the server.'}</p>
            <button 
              onClick={startGeneration}
              className="mt-2 text-xs font-bold text-red-800 dark:text-red-200 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
