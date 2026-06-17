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
  Brain,
  AlertCircle,
  Plus,
  Trash2,
  MessageSquare,
  Menu,
  X,
  History,
  Loader2
} from 'lucide-react';

// Parse message content to render **text** as bold elements smoothly
const formatMessageContent = (content) => {
  if (!content) return '';
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <strong key={idx} className="font-extrabold text-white bg-white/5 px-1 py-0.5 rounded">{boldText}</strong>;
    }
    return part;
  });
};

export default function Assistant() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Chat Sessions List & Active ID
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Loading & State
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop
  const [isMobile, setIsMobile] = useState(false);

  // Chat Conversation State
  const [messages, setMessages] = useState([]);
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

  // Handle mobile screen detection
  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false); // Collapsed by default on mobile
      } else {
        setIsSidebarOpen(true); // Open by default on desktop
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Fetch all chat sessions for the user
  const loadSessions = async (selectLatest = false) => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (selectLatest && data.length > 0 && !activeSessionId) {
          setActiveSessionId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (user) {
      loadSessions(true);
    }
  }, [user]);

  // Load message logs when activeSessionId changes
  const loadMessages = async (sessionId) => {
    if (!sessionId) {
      setMessages([
        {
          role: 'assistant',
          content: "Yo! 👋 I am your Antigravity Finance AI. I've synced up with your e-passbook. Ask me where you spent the most, compare monthly spending, map your active loans, or get some customized savings tips! What's on your mind today?"
        }
      ]);
      return;
    }

    setIsLoadingMessages(true);
    setError('');
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: "Yo! 👋 Welcome back to this chat session. Ask me anything about your e-passbook ledger, compare monthly spending, map your active loans, or get some customized savings tips!"
            }
          ]);
        }
      } else {
        throw new Error('Failed to load chat history.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve chat logs from the database.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId, user]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, isLoadingMessages]);

  // Create a brand new blank chat session
  const handleCreateSession = async () => {
    setError('');
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (res.ok) {
        const newSession = await res.json();
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        if (isMobile) setIsSidebarOpen(false); // Close sidebar on mobile select
      } else {
        throw new Error('Failed to create new session.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not create a new chat session.');
    }
  };

  // Delete a chat session and handle active states
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    setError('');
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);
        if (activeSessionId === sessionId) {
          if (updatedSessions.length > 0) {
            setActiveSessionId(updatedSessions[0].id);
          } else {
            setActiveSessionId(null);
            setMessages([
              {
                role: 'assistant',
                content: "Yo! 👋 I am your Antigravity Finance AI. I've synced up with your e-passbook. Ask me where you spent the most, compare monthly spending, map your active loans, or get some customized savings tips! What's on your mind today?"
              }
            ]);
          }
        }
      } else {
        throw new Error('Failed to delete session.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not delete the chat session.');
    }
  };

  // Handle message sending
  const sendMessage = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isGenerating) return;

    setError('');
    setInput('');
    setIsGenerating(true);

    let currentSessionId = activeSessionId;

    // 1. If no active session exists, automatically create one first!
    if (!currentSessionId) {
      try {
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: prompt.trim() }),
        });
        if (res.ok) {
          const newSession = await res.json();
          currentSessionId = newSession.id;
          setActiveSessionId(currentSessionId);
          setSessions(prev => [newSession, ...prev]);
        } else {
          throw new Error('Failed to create new session.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to establish a new chat session context.');
        setIsGenerating(false);
        return;
      }
    }

    // 2. Append User Message
    const userMessage = { role: 'user', content: prompt.trim() };
    // Clear default initial instructions greeting if sending first message
    const cleanMessages = messages.filter(m => m.id || m.content !== "Yo! 👋 I am your Antigravity Finance AI. I've synced up with your e-passbook. Ask me where you spent the most, compare monthly spending, map your active loans, or get some customized savings tips! What's on your mind today?");
    const updatedMessages = [...cleanMessages, userMessage];
    setMessages(updatedMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          sessionId: currentSessionId,
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

      // Refresh sessions to pull auto-generated title changes and timestamps
      loadSessions(false);

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
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      {/* Decorative Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Split Layout Container */}
      <div className="flex-grow flex w-full max-w-7xl mx-auto px-4 md:px-6 py-6 gap-6 relative overflow-hidden h-[calc(100vh-4rem)]">

        {/* SIDEBAR Panel (ChatGPT history) */}
        <AnimatePresence>
          {/* Mobile Drawer Overlay Backdrop */}
          {isMobile && isSidebarOpen && (
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-10 cursor-pointer"
            />
          )}

          {isSidebarOpen && (
            <motion.aside
              layout
              key="sidebar-aside"
              initial={{ x: isMobile ? -300 : 0, opacity: isMobile ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isMobile ? -300 : 0, opacity: isMobile ? 0 : 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`glass-card border border-white/5 flex flex-col p-4 shrink-0 overflow-hidden z-20 ${isMobile
                  ? 'absolute top-6 bottom-6 left-4 w-72 shadow-2xl bg-slate-950/95 border-white/10'
                  : 'w-72'
                }`}
            >
              {/* Header with New Chat Button */}
              <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-violet-400" /> Chat Logs
                </span>

                {isMobile && (
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Create new chat session button */}
              <button
                onClick={handleCreateSession}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mb-4 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-md shadow-violet-600/15 cursor-pointer uppercase shrink-0"
              >
                <Plus className="w-4 h-4" /> New Session
              </button>

              {/* Scrollable list of sessions */}
              <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin">
                {isLoadingSessions ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                    <span>Syncing past logs...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 px-4 text-xs font-semibold text-slate-600">
                    No active sessions. Send a message to start a new chat!
                  </div>
                ) : (
                  sessions.map((s) => {
                    const isActive = activeSessionId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          if (isMobile) setIsSidebarOpen(false); // close sidebar on select
                        }}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl border transition-all text-left text-xs font-bold select-none group cursor-pointer relative overflow-hidden ${isActive
                            ? 'bg-violet-600/15 border-violet-500/40 text-violet-100 shadow-md shadow-violet-950/20'
                            : 'bg-slate-950/40 hover:bg-slate-900/60 border-white/5 text-slate-400 hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-6">
                          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                          <span className="truncate tracking-wide">{s.title || 'New Chat'}</span>
                        </div>

                        {/* In-place Delete Button */}
                        <button
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 cursor-pointer absolute right-2 top-1/2 -translate-y-1/2"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* MAIN CHAT CONSOLE */}
        <motion.main
          layout
          className="flex-grow glass-card border border-white/5 p-4 md:p-6 flex flex-col gap-4 overflow-hidden relative"
        >

          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
            <div className="text-left flex items-center gap-3">
              {/* Sidebar toggle button (always visible, or mobile-first) */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-white/5 border border-white/10 hover:border-violet-500/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer mr-1"
                title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Brain className="w-6 h-6 text-violet-400 shrink-0" /> Gemini Finance Assistant
                </h1>
                <p className="text-slate-400 text-[10px] md:text-xs mt-0.5 font-semibold">
                  Real-time ledger analytics & budget optimization.
                </p>
              </div>
            </div>

            {/* Syncing Indicators */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Ledger Linked
              </span>
            </div>
          </div>

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center justify-between gap-4 shrink-0 text-left">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
                  if (lastUserMessage) {
                    setMessages(prev => {
                      const next = [...prev];
                      if (next.length > 0 && next[next.length - 1].role === 'assistant' && !next[next.length - 1].content) {
                        next.pop();
                      }
                      return next;
                    });
                    sendMessage(lastUserMessage.content);
                  } else {
                    sendMessage();
                  }
                }}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 text-rose-300 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all shrink-0 cursor-pointer"
              >
                Retry Dispatch
              </button>
            </div>
          )}

          {/* CHAT VIEWPORT scroll container */}
          <div className="flex-grow overflow-y-auto flex flex-col gap-6 pr-2 scrollbar-thin scroll-smooth min-h-0">
            {isLoadingMessages ? (
              <div className="flex-grow flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                <span className="text-slate-500 text-sm font-semibold">Loading conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              /* Premium Onboarding / Empty State */
              <div className="flex-grow flex flex-col justify-center items-center py-8 text-center max-w-xl mx-auto gap-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-violet-600/20 animate-bounce">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-white text-lg font-black tracking-tight">AI Personal Finance Assistant</h3>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                    This hyper-intelligent AI is linked directly with your transaction books. Compare cycles, locate spending outliers, analyze active lending logs, or create smart savings strategies instantly.
                  </p>
                </div>

                {/* Suggestions Tags */}
                <div className="w-full flex flex-col gap-2 mt-4">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider text-left pl-2">Suggested Analytics</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {suggestions.map((s, idx) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => sendMessage(s.text)}
                          className="flex items-center gap-3 px-4 py-3.5 bg-slate-950/50 hover:bg-violet-600/10 border border-white/5 hover:border-violet-500/30 text-slate-300 hover:text-white rounded-2xl text-xs font-bold text-left transition-all cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-violet-600/10 group-hover:bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span>{s.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Message Bubbles list */
              <div className="flex flex-col gap-6">
                {messages.map((msg, idx) => {
                  const isAi = msg.role === 'assistant';
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3.5 text-left ${isAi ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAi && (
                        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 shadow-sm shadow-violet-950/50">
                          <Bot className="w-5 h-5" />
                        </div>
                      )}

                      <div className={`p-4 rounded-2xl max-w-[85%] md:max-w-xl text-sm leading-relaxed shadow-sm ${isAi
                          ? 'bg-slate-950/50 border border-white/5 text-slate-200 font-medium'
                          : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold'
                        }`}>
                        <div className="whitespace-pre-line break-words">
                          {formatMessageContent(msg.content)}
                        </div>
                      </div>

                      {!isAi && (
                        <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-950/50">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isGenerating && (
                  <div className="flex gap-3.5 text-left justify-start">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 animate-pulse">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                      Analyzing Database ledger...
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input Panel */}
          <form onSubmit={handleFormSubmit} className="flex gap-3 items-center shrink-0 border-t border-white/5 pt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isGenerating
                  ? "Gemini is auditing balance sheets..."
                  : "Ask Gemini (e.g. Compare my spending or Smart savings tips)"
              }
              className="flex-grow pl-5 pr-4 py-3.5 bg-slate-950/60 border border-white/10 rounded-2xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-violet-500 font-semibold focus:ring-1 focus:ring-violet-500/20"
              disabled={isGenerating || isLoadingMessages}
            />
            <button
              type="submit"
              disabled={isGenerating || isLoadingMessages || !input.trim()}
              className="p-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-2xl transition-all btn-glow shadow-md shadow-violet-600/15 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

        </motion.main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-4 shrink-0 z-10 bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-[10px] text-center font-bold uppercase tracking-wider">
          Powered by Google Gemini 2.5 Flash with Database Tool Access & Session History.
        </div>
      </footer>
    </div>
  );
}
