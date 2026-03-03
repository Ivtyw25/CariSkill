'use client';

import { useState, useEffect } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface BookmarkButtonProps {
    roadmapId: string;
    moduleId: string;
    type: 'materials' | 'flashcards' | 'quiz' | 'summary';
    title: string;
    className?: string;
}

export default function BookmarkButton({ roadmapId, moduleId, type, title, className = '' }: BookmarkButtonProps) {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        const checkBookmark = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data } = await supabase
                    .from('bookmarks')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('node_id', moduleId)
                    .eq('type', type)
                    .limit(1);

                if (data && data.length > 0) {
                    setIsBookmarked(true);
                }
            } catch (err) {
                console.error("Error checking bookmark:", err);
            } finally {
                setLoading(false);
            }
        };
        checkBookmark();
    }, [moduleId, type]);

    const handleToggle = async () => {
        if (toggling || loading) return;
        setToggling(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (isBookmarked) {
                // Remove bookmark
                await supabase
                    .from('bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('node_id', moduleId)
                    .eq('type', type);
                setIsBookmarked(false);
            } else {
                // Add bookmark
                // Ensure roadmap_nodes exists for the FK, though we trust it does
                const realRoadmapId = await supabase
                    .from('roadmap_nodes')
                    .select('roadmap_id')
                    .eq('node_id', moduleId)
                    .single()
                    .then(res => res.data?.roadmap_id);

                await supabase.from('bookmarks').insert({
                    user_id: user.id,
                    roadmap_id: realRoadmapId || null,
                    node_id: moduleId,
                    type,
                    title,
                    url: `/skill/${roadmapId}/${moduleId}/${type}`
                });
                setIsBookmarked(true);
            }
        } catch (err) {
            console.error("Error toggling bookmark:", err);
        } finally {
            setToggling(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={loading || toggling}
            title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
            className={`p-2.5 rounded-full transition-all duration-300 shadow-sm disabled:opacity-50 overflow-hidden flex items-center justify-center ${isBookmarked
                ? 'bg-[#FFD700] text-gray-900 border border-[#E6C200]'
                : 'bg-white text-gray-400 hover:text-[#CA8A04] hover:bg-[#FEF9C3] border border-gray-100 hover:border-[#FDE68A]'
                } ${className}`}
        >
            <AnimatePresence mode="wait">
                {toggling ? (
                    <motion.div key="loading" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </motion.div>
                ) : (
                    <motion.div key="icon" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                        <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
}
