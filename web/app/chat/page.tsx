'use client';

import React, { useEffect, useState, useRef } from 'react';
import { History, Bot, User, Send, Compass, Info, ArrowRight } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';

import MarkdownText from '@/components/chat/MarkdownText';
import ChatEmptyState from '@/components/chat/ChatEmptyState';

interface MessageRecord {
    id: string;
    created_at: string;
    role: 'user' | 'ai';
    content: string;
    type: string;
}

export default function ChatPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <ChatContent />
        </React.Suspense>
    );
}

function ChatContent() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const specificChatId = searchParams.get('id');

    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<MessageRecord[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [generationData, setGenerationData] = useState<{ topic: string, experience: string, goal?: string, constraints?: string } | null>(null);
    const initialTriggerRef = useRef<Set<string>>(new Set());

    // Secure the route
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Handle Active Chat Selection
    useEffect(() => {
        if (specificChatId && specificChatId !== selectedChatId) {
            setSelectedChatId(specificChatId);
        } else if (!specificChatId) {
            // Need an ID to continue
            router.push('/setup');
        }
    }, [specificChatId, router, selectedChatId]);

    // Load Local Messages
    useEffect(() => {
        if (!selectedChatId) return;

        setLoadingMessages(true);
        const storedMessages = localStorage.getItem(`chat_messages_${selectedChatId}`);
        const initialTopic = localStorage.getItem(`chat_initial_topic_${selectedChatId}`);
        const storedGenData = localStorage.getItem(`chat_generation_${selectedChatId}`);

        if (storedGenData) {
            try {
                setGenerationData(JSON.parse(storedGenData));
            } catch (e) { }
        }

        if (storedMessages) {
            setMessages(JSON.parse(storedMessages));
        } else if (initialTopic) {
            const initialUserMessage: MessageRecord = {
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                role: 'user',
                content: initialTopic,
                type: 'text'
            };
            setMessages([initialUserMessage]);
            localStorage.setItem(`chat_messages_${selectedChatId}`, JSON.stringify([initialUserMessage]));
            // Clear initial topic so we don't duplicate it
            localStorage.removeItem(`chat_initial_topic_${selectedChatId}`);
        } else {
            console.warn("No active topic or history found for this session ID.");
            router.push('/setup');
        }
        setTimeout(() => setLoadingMessages(false), 1000);
    }, [selectedChatId, router]);

    // Helper to update state and localStorage together
    const saveMessages = (newMessages: MessageRecord[], chatId: string) => {
        setMessages(newMessages);
        localStorage.setItem(`chat_messages_${chatId}`, JSON.stringify(newMessages));
    };

    // Auto-trigger API for fresh chats directly from /setup
    useEffect(() => {
        if (messages.length === 1 && messages[0].role === 'user' && !loadingMessages && selectedChatId) {
            if (initialTriggerRef.current.has(selectedChatId)) return;

            initialTriggerRef.current.add(selectedChatId);
            setIsSending(true);

            const triggerInitialAI = async () => {
                try {
                    const response = await fetch('/api/chat/setup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ session_id: selectedChatId, message: messages[0].content, history: messages })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const aiReply = data.response?.reply || "Let me help you plan your learning journey!";
                        const readyToGenerate = data.response?.ready_to_generate;
                        const topic = data.response?.topic;

                        const aiReplyMsg: MessageRecord = {
                            id: crypto.randomUUID(),
                            created_at: new Date().toISOString(),
                            role: 'ai',
                            content: aiReply,
                            type: 'text'
                        };

                        setMessages(prev => {
                            const newMsgs = [...prev, aiReplyMsg];
                            localStorage.setItem(`chat_messages_${selectedChatId}`, JSON.stringify(newMsgs));
                            return newMsgs;
                        });

                        if (readyToGenerate && topic) {
                            const newGenData = {
                                topic,
                                experience: data.response?.experience || 'Beginner',
                                goal: data.response?.goal || 'No specific goal',
                                constraints: data.response?.constraints || 'None specified'
                            };
                            setGenerationData(newGenData);
                            localStorage.setItem(`chat_generation_${selectedChatId}`, JSON.stringify(newGenData));
                        }
                    }
                } catch (error) {
                    console.error("Error triggering initial AI response:", error);
                } finally {
                    setIsSending(false);
                }
            };
            triggerInitialAI();
        }
    }, [messages, selectedChatId, loadingMessages, router]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !selectedChatId || isSending) return;

        const currentMsg = inputMessage.trim();
        setInputMessage("");
        setIsSending(true);

        try {
            const userMsg: MessageRecord = {
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                role: 'user',
                content: currentMsg,
                type: 'text'
            };

            const updatedMsgsWithUser = [...messages, userMsg];
            saveMessages(updatedMsgsWithUser, selectedChatId);

            const response = await fetch('/api/chat/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: selectedChatId, message: currentMsg, history: updatedMsgsWithUser })
            });

            if (!response.ok) throw new Error(`API returned ${response.status}`);

            const data = await response.json();

            const aiReply = data.response?.reply || "I'm here to help!";
            const readyToGenerate = data.response?.ready_to_generate;
            const topic = data.response?.topic;

            const aiMsg: MessageRecord = {
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                role: 'ai',
                content: aiReply,
                type: 'text'
            };

            const finalMsgs = [...updatedMsgsWithUser, aiMsg];
            saveMessages(finalMsgs, selectedChatId);

            if (readyToGenerate && topic) {
                const newGenData = {
                    topic,
                    experience: data.response?.experience || 'Beginner',
                    goal: data.response?.goal || 'No specific goal',
                    constraints: data.response?.constraints || 'None specified'
                };
                setGenerationData(newGenData);
                localStorage.setItem(`chat_generation_${selectedChatId}`, JSON.stringify(newGenData));
            }

        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setIsSending(false);
        }
    };

    const chatContainerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const messageVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 250, damping: 24 } }
    };

    const sidebarVariants: Variants = {
        hidden: { opacity: 0, x: -30 },
        show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
    };

    const inputVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.4, ease: 'easeOut' } }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Global loading state while checking auth
    if (authLoading) {
        return (
            <div className="flex flex-col h-screen bg-white overflow-hidden">
                <Navbar isLoggedIn={!!user} />
                <div className="flex flex-1 w-full items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-white overflow-hidden">
            <Navbar isLoggedIn={!!user} />

            <div className="flex flex-1 w-full overflow-hidden">
                {/* Sidebar for Chat History (Removed for focused flow) */}

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col relative bg-[#FFFDF5]">
                    {/* Top Temporary Session Banner */}
                    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-yellow-800 z-20 shrink-0">
                        <Info size={16} />
                        <span>This is a temporary chat session to tailor your roadmap. History will not be saved.</span>
                    </div>
                    {/* Background Pattern */}
                    <div
                        className="absolute inset-0 z-0 pointer-events-none opacity-[0.15]"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 2px 2px, #ca8a04 1px, transparent 0)',
                            backgroundSize: '32px 32px'
                        }}
                    />

                    {/* Decorative Watermark Vectors */}
                    <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-between opacity-[0.05] p-20">
                        <div className="text-yellow-600">
                            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v4h-2V7zm0 6h2v2h-2v-2z" /></svg>
                        </div>
                        <div className="text-yellow-600">
                            <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor"><path d="M22.956 16.513c-.156-1.026-1.127-1.745-2.155-1.587l-1.397.214a10.02 10.02 0 0 0-1.603-3.877l1.01-1.01c.732-.731.732-1.916 0-2.648l-2.022-2.022c-.732-.731-1.916-.731-2.648 0l-1.01 1.01a10.02 10.02 0 0 0-3.877-1.603l.214-1.397c.158-1.028-.561-1.999-1.587-2.155l-2.822-.43A2.001 2.001 0 0 0 2.766 2.8l-.43 2.822c-.156 1.026.561 1.999 1.587 2.155l1.397-.214a10.02 10.02 0 0 0 1.603 3.877l-1.01 1.01c-.732.731-.732 1.916 0 2.648l2.022 2.022c.732.731 1.916.731 2.648 0l1.01-1.01a10.02 10.02 0 0 0 3.877 1.603l-.214 1.397c-.158 1.028.561 1.999 1.587 2.155l2.822.43c1.109.17 2.139-.623 2.296-1.792l.43-2.822z" /></svg>
                        </div>
                    </div>

                    {/* EMPTY STATE */}
                    {messages.length === 0 && !loadingMessages ? (
                        <ChatEmptyState />
                    ) : (
                        <>
                            {/* Messages Area */}
                            {loadingMessages ? (
                                <div className="flex-1 overflow-y-auto px-8 py-10 z-10 flex flex-col items-center justify-center gap-8 max-w-5xl mx-auto w-full">
                                    <div className="animate-spin w-6 h-6 border-3 border-yellow-400 border-t-transparent rounded-full opacity-50"></div>
                                </div>
                            ) : (
                                <motion.div
                                    key={selectedChatId}
                                    variants={chatContainerVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="flex-1 overflow-y-auto px-8 py-10 z-10 flex flex-col gap-8 max-w-5xl mx-auto w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                >
                                    {messages.map((message, index) => {
                                        const isLastMessage = index === messages.length - 1;
                                        if (message.role === 'ai') {
                                            return (
                                                <motion.div key={message.id} variants={messageVariants} initial="hidden" animate="show" className="flex gap-4 items-start pr-12">
                                                    <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center shrink-0 border-2 border-transparent shadow-sm">
                                                        <Bot size={20} className="text-yellow-400" />
                                                    </div>
                                                    <div className="bg-white rounded-2xl rounded-tl-sm shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-5 border border-gray-100 text-gray-700 text-[15px] leading-relaxed min-w-[300px] max-w-[85%]">
                                                        {message.content && <MarkdownText content={message.content} />}

                                                        {isLastMessage && generationData && (
                                                            <div className="mt-4 flex flex-col items-center text-center p-5 bg-yellow-50/50 rounded-xl border border-yellow-100">
                                                                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 mb-3 shadow-[0_2px_8px_rgba(250,204,21,0.2)]">
                                                                    <Compass size={24} />
                                                                </div>
                                                                <h3 className="font-bold text-gray-900 mb-1 text-lg">Ready to Generate</h3>
                                                                <p className="text-[14px] text-gray-600 mb-5 leading-relaxed">
                                                                    We have gathered enough information! Are you ready to generate your customized roadmap for <strong className="text-black">{generationData.topic}</strong>?
                                                                </p>
                                                                <button
                                                                    onClick={() => {
                                                                        const skillSlug = generationData.topic.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/ +/g, '-');
                                                                        localStorage.setItem(`chat_for_${skillSlug}`, selectedChatId!);
                                                                        localStorage.setItem('generation_payload', JSON.stringify({
                                                                            topic: generationData.topic,
                                                                            experience: generationData.experience,
                                                                            goal: generationData.goal,
                                                                            constraints: generationData.constraints,
                                                                            session_id: selectedChatId
                                                                        }));
                                                                        router.push(`/setup/loading`);
                                                                    }}
                                                                    className="w-full h-12 bg-[#FFD900] hover:bg-yellow-400 transition-colors rounded-xl font-bold flex items-center justify-center gap-2 text-black shadow-sm"
                                                                >
                                                                    Generate My Roadmap! <ArrowRight size={18} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        } else {
                                            return (
                                                <motion.div key={message.id} variants={messageVariants} initial="hidden" animate="show" className="flex gap-4 items-start pl-12 justify-end">
                                                    <div className="bg-[#FFD900] rounded-2xl rounded-tr-sm shadow-[0_4px_15px_rgba(255,215,0,0.2)] p-5 border border-black text-gray-900 text-[15px] leading-relaxed max-w-[85%] font-medium whitespace-pre-wrap">
                                                        {message.content}
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-[#FFD900] border border-black flex items-center justify-center shrink-0 shadow-sm">
                                                        <User size={18} className="text-black" />
                                                    </div>
                                                </motion.div>
                                            );
                                        }
                                    })}
                                    {isSending && (
                                        <motion.div variants={messageVariants} initial="hidden" animate="show" className="flex gap-4 items-start pr-12">
                                            <div className="w-10 h-10 rounded-full bg-[#111827] flex items-center justify-center shrink-0 border-2 border-transparent shadow-sm">
                                                <Bot size={20} className="text-yellow-400" />
                                            </div>
                                            <div className="bg-white rounded-2xl rounded-tl-sm shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-5 border border-gray-100 text-gray-700 text-[15px] leading-relaxed max-w-[85%] flex items-center gap-1.5 h-[56px]">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* Input Area */}
                            <motion.div
                                variants={inputVariants}
                                initial="hidden"
                                animate="show"
                                className="z-10 pb-6 pt-4 px-8 max-w-5xl mx-auto w-full"
                            >
                                <div className="relative flex items-center justify-center gap-4">
                                    <div className="flex-1 relative shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl">
                                        <input
                                            type="text"
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            disabled={isSending || loadingMessages}
                                            placeholder={isSending ? "AI is thinking..." : "Type your response..."}
                                            className="w-full h-14 pl-6 pr-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 text-[15px] disabled:opacity-50"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isSending || loadingMessages || !inputMessage.trim()}
                                        className="h-14 bg-[#FFD900] rounded-2xl px-8 flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors shadow-[0_4px_15px_rgba(255,215,0,0.3)] border border-black shrink-0 font-medium text-black disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSending ? (
                                            <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></div>
                                        ) : (
                                            <>Send <Send size={18} className="ml-1" /></>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
