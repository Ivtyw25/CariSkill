'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Bot, User, Send, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface MessageRecord {
    id: string;
    created_at: string;
    role: 'user' | 'ai';
    content: string;
    type: string;
    chat_id: string;
}

// Lightweight markdown renderer — no external dependency
function MarkdownText({ content }: { content: string }) {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    const renderInline = (text: string, key: string): React.ReactNode => {
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**'))
                return <strong key={`${key}-b${i}`} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*'))
                return <em key={`${key}-em${i}`} className="italic text-gray-500">{part.slice(1, -1)}</em>;
            if (part.startsWith('`') && part.endsWith('`'))
                return <code key={`${key}-c${i}`} className="bg-gray-100 px-1 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
            return part;
        });
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.match(/^[-*•]\s/)) {
            const items: string[] = [];
            while (i < lines.length && lines[i].match(/^[-*•]\s/)) {
                items.push(lines[i].replace(/^[-*•]\s/, ''));
                i++;
            }
            elements.push(
                <ul key={`ul-${i}`} className="list-disc pl-4 my-1 space-y-0.5">
                    {items.map((item, idx) => (
                        <li key={idx} className="text-sm">{renderInline(item, `li-${i}-${idx}`)}</li>
                    ))}
                </ul>
            );
        } else if (line.match(/^#+\s/)) {
            elements.push(<p key={`h-${i}`} className="font-semibold text-gray-900 text-sm mb-0.5">{line.replace(/^#+\s/, '')}</p>);
            i++;
        } else if (line.trim() === '') {
            i++;
        } else {
            elements.push(<p key={`p-${i}`} className="mb-1">{renderInline(line, `p-${i}`)}</p>);
            i++;
        }
    }
    return <>{elements}</>;
}

export default function FloatingChat({ chatId, roadmapTopic, roadmapId }: { chatId: string; roadmapTopic?: string; roadmapId?: string }) {
    const { user, isLoading: authLoading } = useAuth();
    const supabase = createClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<MessageRecord[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [editStatus, setEditStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [currentRoadmap, setCurrentRoadmap] = useState<any>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending]);

    // Fetch Messages when opened
    useEffect(() => {
        if (!chatId || !isOpen) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            const { data, error } = await supabase
                .from('messages')
                .select('id, created_at, role, content, type, chat_id')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (!error && data) setMessages(data);
            else { if (error) console.error('Error fetching messages:', error); setMessages([]); }
            setLoadingMessages(false);
        };

        fetchMessages();

        // Also fetch current roadmap for edit mode
        if (roadmapId) {
            supabase.from('roadmaps').select('content').eq('id', roadmapId).single()
                .then(({ data }) => { if (data) setCurrentRoadmap(data.content); });
        }

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`messages_${chatId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    const newMsg = payload.new as MessageRecord;
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [chatId, isOpen, supabase]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !chatId || isSending) return;

        const currentMsg = inputMessage.trim();
        setInputMessage('');
        setIsSending(true);

        try {
            const { data: insertedUserMsg, error: insertError } = await supabase
                .from('messages')
                .insert([{ chat_id: chatId, role: 'user', content: currentMsg, type: 'text' }])
                .select().single();

            if (insertError) throw insertError;

            if (insertedUserMsg) {
                setMessages(prev => {
                    if (prev.some(m => m.id === insertedUserMsg.id)) return prev;
                    return [...prev, insertedUserMsg];
                });
            }

            const response = await fetch('/api/chat/roadmap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: chatId,
                    message: currentMsg,
                    history: messages,
                    roadmap_context: roadmapTopic || null,
                    current_roadmap: currentRoadmap || null
                })
            });

            if (!response.ok) throw new Error(`API returned ${response.status}`);

            const data = await response.json();
            const aiReply = data.response?.reply || "I'm here to help with your roadmap!";
            const editRoadmap = data.response?.edit_roadmap;
            const updatedRoadmap = data.response?.updated_roadmap;

            // If the AI wants to edit the roadmap, save it to Supabase then reload
            if (editRoadmap && updatedRoadmap && roadmapId) {
                setEditStatus('saving');
                const { error: updateError } = await supabase
                    .from('roadmaps')
                    .update({ content: updatedRoadmap })
                    .eq('id', roadmapId);

                if (updateError) {
                    console.error('Failed to update roadmap:', updateError);
                    setEditStatus('error');
                } else {
                    setEditStatus('saved');
                    // Insert the AI reply as a confirmation message
                    await supabase.from('messages').insert([{ chat_id: chatId, role: 'ai', content: aiReply, type: 'text' }]);
                    setTimeout(() => window.location.reload(), 2000);
                    return;
                }
            }

            const { data: insertedAiMsg, error: aiInsertError } = await supabase
                .from('messages')
                .insert([{ chat_id: chatId, role: 'ai', content: aiReply, type: 'text' }])
                .select().single();

            if (aiInsertError) throw aiInsertError;

            if (insertedAiMsg) {
                setMessages(prev => {
                    if (prev.some(m => m.id === insertedAiMsg.id)) return prev;
                    return [...prev, insertedAiMsg];
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const modalVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
    };

    const messageVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="mb-4 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-[#FFD900] p-4 flex items-center justify-between border-b border-yellow-500/20 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <Bot size={20} className="text-gray-900 shrink-0" />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-900 text-sm leading-none">Masterflow Assistant</h3>
                                    {roadmapTopic && (
                                        <p className="text-gray-700 text-xs mt-0.5 truncate">{roadmapTopic}</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-gray-900 hover:bg-yellow-400 p-1 rounded-md transition-colors shrink-0 ml-2">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Edit status banner */}
                        {editStatus === 'saving' && (
                            <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center gap-2 text-blue-700 text-xs font-medium shrink-0">
                                <div className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" />
                                Saving roadmap changes...
                            </div>
                        )}
                        {editStatus === 'saved' && (
                            <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2 text-green-700 text-xs font-medium shrink-0">
                                ✅ Roadmap updated! Refreshing page...
                            </div>
                        )}
                        {editStatus === 'error' && (
                            <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2 text-red-700 text-xs font-medium shrink-0">
                                ❌ Failed to save changes. Try again.
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 bg-[#FFFDF5] flex flex-col gap-4">
                            {loadingMessages ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full opacity-50" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 gap-2">
                                    <MessageCircle className="w-10 h-10 text-yellow-500" />
                                    <p className="text-sm text-gray-600 font-medium">
                                        {roadmapTopic
                                            ? `Ask me anything about your ${roadmapTopic} roadmap!`
                                            : 'Start asking about your roadmap!'}
                                    </p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    if (message.role === 'ai') {
                                        return (
                                            <motion.div key={message.id} variants={messageVariants} initial="hidden" animate="show" className="flex gap-3 items-start pr-8">
                                                <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center shrink-0 shadow-sm mt-1">
                                                    <Bot size={16} className="text-yellow-400" />
                                                </div>
                                                <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm p-3 border border-gray-100 text-gray-700 text-sm leading-relaxed">
                                                    <MarkdownText content={message.content} />
                                                </div>
                                            </motion.div>
                                        );
                                    } else {
                                        return (
                                            <motion.div key={message.id} variants={messageVariants} initial="hidden" animate="show" className="flex gap-3 items-start pl-8 justify-end">
                                                <div className="bg-[#FFD900] rounded-2xl rounded-tr-sm shadow-sm p-3 border border-yellow-500/20 text-gray-900 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                                                    {message.content}
                                                </div>
                                            </motion.div>
                                        );
                                    }
                                })
                            )}
                            {isSending && (
                                <motion.div variants={messageVariants} initial="hidden" animate="show" className="flex gap-3 items-start pr-8">
                                    <div className="w-8 h-8 rounded-full bg-[#111827] flex items-center justify-center shrink-0 shadow-sm mt-1">
                                        <Bot size={16} className="text-yellow-400" />
                                    </div>
                                    <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm p-3 border border-gray-100 text-gray-700 text-sm flex items-center gap-1 h-[42px]">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }} />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }} />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    disabled={isSending || loadingMessages}
                                    placeholder={isSending ? 'Thinking...' : roadmapTopic ? `Ask about ${roadmapTopic}...` : 'Message AI...'}
                                    className="flex-1 h-10 pl-4 pr-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-sm disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isSending || loadingMessages || !inputMessage.trim()}
                                    className="h-10 w-10 bg-[#111827] hover:bg-gray-800 rounded-xl flex items-center justify-center transition-colors shadow-md text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                    {isSending ? (
                                        <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full" />
                                    ) : (
                                        <Send size={16} className="-ml-0.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-[#111827] text-yellow-400 shadow-xl flex items-center justify-center border-2 border-transparent hover:border-yellow-400 transition-colors z-50 focus:outline-none"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
            </motion.button>
        </div>
    );
}
