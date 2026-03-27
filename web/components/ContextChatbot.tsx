'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSkillLanguage } from '@/components/SkillLanguageProvider';
import { useAuth } from '@/components/AuthProvider';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ContextChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  materialContext: string;
}

export default function ContextChatbot({ isOpen, onClose, selectedText, materialContext }: ContextChatbotProps) {
  const { currentLanguage } = useSkillLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle initialization and first automated message
  useEffect(() => {
    if (isOpen && selectedText) {
      const initChat = async () => {
        const initialQuestion = `What is meant by "${selectedText}" according to the material?`;
        
        setMessages([{ role: 'user', content: initialQuestion }]);
        setIsLoading(true);

        try {
          const res = await fetch('/api/context-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: initialQuestion }],
              contextText: materialContext,
              preferredLanguage: currentLanguage
            })
          });

          if (!res.ok) throw new Error("API Failed");
          const data = await res.json();
          
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err) {
          console.error(err);
          setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error explaining that text. Please try again." }]);
        } finally {
          setIsLoading(false);
        }
      };

      initChat();
    } else {
      // Clean reset when closed: this fulfills the ephemeral chat requirement
      setMessages([]);
      setInput("");
      setIsLoading(false);
    }
  }, [isOpen, selectedText, materialContext]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, { role: 'user', content: userMessage }];

      const res = await fetch('/api/context-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          contextText: materialContext,
          preferredLanguage: currentLanguage
        })
      });

      if (!res.ok) throw new Error("API Failed");
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error while responding. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-[100] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FFD700] text-gray-900 border-b border-yellow-400/30 shadow-sm z-10">
        <div className="flex items-center gap-2 font-bold">
          <Bot className="w-5 h-5" />
          <span>Reading Assistant</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-yellow-400 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[90%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>
              {m.role === 'user' ? (
                user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className={`p-3 rounded-2xl text-[14px] leading-relaxed relative ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm shadow-md' 
                : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-tl-sm prose prose-sm prose-p:leading-snug'
            }`}>
              {m.role === 'assistant' ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-yellow-100 text-yellow-600">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm text-gray-500 flex items-center gap-2 text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-500" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-12 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent resize-none transition-shadow"
            rows={2}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-[#FFD700] hover:bg-[#E6C200] text-gray-900 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
