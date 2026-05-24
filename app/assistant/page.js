'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  TrendingUp, 
  PiggyBank, 
  Lightbulb, 
  LineChart,
  HelpCircle,
  Brain,
  AlertCircle
} from 'lucide-react';

export default function Assistant() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Chat Conversation State
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: "Yo! 👋 I am your Antigravity Finance AI. I've synced up with your e-passbook. Ask me where you spent the most, compare monthly spending, map your active loans, or get some customized savings tips! What's on your mind today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Scroll Container Ref
  const messagesEndRef = useRef(null);

  // Suggested Prompts list
  const suggestions = [
    { text: "Where did I spend the most money?", icon: TrendingUp },
    { text: "Compare this month with last month.", icon: LineChart },
    { text: "Suggest some smart savings ideas.", icon: Lightbulb },
    { text: "Give me my loan and lending summary.", icon: PiggyBank }
  ];

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Handle message sending
  const sendMessage = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isGenerating) return;

    setError('');
    setInput('');
    setIsGenerating(true);

    const userMessage = { role: 'user', content: prompt.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate response.');
      }

      // Read streamed chunk values!
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let currentResponse = '';

      // Append blank assistant placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value);
        currentResponse += textChunk;

        // Update the last assistant response chunk
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1].content = currentResponse;
          return next;
        });
      }

    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Something went wrong. Please ensure your GEMINI_API_KEY is configured in the `.env` file.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      <Navbar />

      {/* Decorative Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-6 flex flex-col gap-4 max-h-[calc(100vh-4rem)]">
        
        {/* Row 1: Header Welcome */}
        <div className="text-left shrink-0">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Brain className="w-7 h-7 text-violet-400" /> Gemini Finance Assistant
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-semibold">Real-time ledger analytics & budget optimization.</p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 shrink-0 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Row 2: Chat Viewport scroll container */}
        <div className="flex-grow glass-card border border-white/5 p-6 overflow-y-auto flex flex-col gap-6 max-h-[calc(100vh-18rem)]">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isAi = msg.role === 'assistant';
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 text-left ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center shrink-0">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                  )}

                  <div className={`p-4 rounded-2xl max-w-xl text-sm leading-relaxed ${
                    isAi
                      ? 'bg-slate-900/60 border border-white/5 text-slate-200'
                      : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold'
                  }`}>
                    {/* Render formatting paragraphs & lists */}
                    <div className="whitespace-pre-line font-medium">
                      {msg.content}
                    </div>
                  </div>

                  {!isAi && (
                    <div className="w-8 h-8 rounded-full bg-cyan-600/25 border border-cyan-500/35 text-cyan-400 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4.5 h-4.5" />
                    </div>
                  )}
                </motion.div>
              );
            })}

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 text-left justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-slate-500 text-sm flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping"></span>
                  Analyzing Database ledger...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Row 3: Suggestion Tags panel (only shown if not actively generating) */}
        {!isGenerating && messages.length <= 2 && (
          <div className="flex flex-wrap gap-2.5 justify-center py-2 shrink-0">
            {suggestions.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={idx}
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/60 hover:bg-white/5 border border-white/10 hover:border-violet-500/30 text-slate-400 hover:text-white rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-violet-400" />
                  <span>{s.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Row 4: Input Panel */}
        <form onSubmit={handleFormSubmit} className="flex gap-3 items-center shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isGenerating ? "Gemini is analyzing..." : "Ask Gemini (e.g. Compare my spending or Loan summary)"}
            className="flex-grow pl-5 pr-4 py-3.5 bg-slate-950/60 border border-white/10 rounded-2xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 font-semibold"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={isGenerating || !input.trim()}
            className="p-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-2xl transition-all btn-glow shadow-md shadow-violet-600/15 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-[10px] text-center font-medium">
          Powered by Google Gemini 2.5 Flash with Database Tool Access.
        </div>
      </footer>
    </div>
  );
}
