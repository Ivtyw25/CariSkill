'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
}

interface DiscussionRoomProps {
  roadmapId: string;  // The roadmaps.id (shared UUID for this community skill)
}

export default function DiscussionRoom({ roadmapId }: DiscussionRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      await fetchMessages();
    };
    init();
  }, [roadmapId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_discussions')
      .select('id, message, created_at, user_id, user_name, user_avatar')
      .eq('roadmap_id', roadmapId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) setMessages(data);
    setLoading(false);
  };

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !user) return;

    setSending(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { error } = await supabase.from('community_discussions').insert({
      roadmap_id: roadmapId,
      user_id: user.id,
      message: trimmed,
      user_name: profile?.full_name || user.email?.split('@')[0] || 'Anonymous',
      user_avatar: null,
    });

    if (!error) {
      setNewMessage('');
      await fetchMessages();
    } else {
      console.error('Failed to send message:', error);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-MY', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getAvatarUrl = (msg: Message) =>
    msg.user_avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.user_name || 'User')}&background=FEF9C3&color=A16207&bold=true&size=64`;

  return (
    <div className="w-full mt-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Discussion Room</h3>
            <p className="text-xs text-gray-400">Ask questions &amp; share tips with other learners</p>
          </div>
          <span className="ml-auto bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {messages.length} messages
          </span>
        </div>

        {/* Messages */}
        <div className="h-72 overflow-y-auto px-6 py-4 space-y-4 bg-[#FFFDF6]/50">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isOwn = user && msg.user_id === user.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                  >
                    <img
                      src={getAvatarUrl(msg)}
                      alt={msg.user_name || 'User'}
                      className="w-8 h-8 rounded-full border border-gray-100 object-cover flex-shrink-0 mt-0.5"
                    />
                    <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-bold text-gray-700">{isOwn ? 'You' : (msg.user_name || 'Anonymous')}</span>
                        <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-[#FFD700] text-gray-900 rounded-tr-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white">
          {user ? (
            <div className="flex gap-3 items-end">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message... (Enter to send)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                className="w-10 h-10 bg-[#FFD700] hover:bg-[#E6C200] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-colors active:scale-95 mb-0.5"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-900" />
                ) : (
                  <Send className="w-4 h-4 text-gray-900" />
                )}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-400 py-2">
              Please <span className="text-yellow-600 font-bold">log in</span> to join the discussion.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
