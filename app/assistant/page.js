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
  Loader2,
  ChevronDown
} from 'lucide-react';

// Parse message content to render markdown elements (bold, inline code, tables, lists, HR) smoothly
const formatMessageContent = (content, isAi = false) => {
  if (!content) return [];

  const renderTextWithFormatting = (text) => {
    if (!text) return '';
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(regex);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={idx} className="font-extrabold text-white bg-white/5 px-1 py-0.5 rounded">
            {boldText}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        return (
          <code key={idx} className="font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20 text-xs">
            {codeText}
          </code>
        );
      }
      return part;
    });
  };

  const renderCellContent = (cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith('+')) {
      return <span className="text-emerald-400 font-semibold">{renderTextWithFormatting(cell)}</span>;
    }
    if (trimmed.startsWith('-') && !trimmed.startsWith('---')) {
      return <span className="text-rose-400 font-semibold">{renderTextWithFormatting(cell)}</span>;
    }
    return renderTextWithFormatting(cell);
  };

  const lines = content.split('\n');
  const elements = [];
  let currentTable = null;
  let currentList = null; // { type: 'ul'|'ol', items: [] }
  let paragraphText = [];

  const flushParagraph = (key) => {
    if (paragraphText.length > 0) {
      const text = paragraphText.join('\n').trim();
      if (text) {
        elements.push(
          <p key={`p-${key}`} className="whitespace-pre-line break-words mb-3 last:mb-0 leading-relaxed">
            {renderTextWithFormatting(text)}
          </p>
        );
      }
      paragraphText = [];
    }
  };

  const flushTable = (key) => {
    if (currentTable) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/40 shadow-inner">
          <table className="w-full border-collapse text-left text-xs md:text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {currentTable.headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-4 py-3 font-bold text-white tracking-wider">
                    {renderTextWithFormatting(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentTable.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 text-slate-300">
                      {renderCellContent(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTable = null;
    }
  };

  const flushList = (key) => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${key}`} className={`list-disc list-inside space-y-1.5 my-3 pl-2 leading-relaxed ${isAi ? 'text-slate-300' : 'text-white'}`}>
            {currentList.items.map((item, itemIdx) => (
              <li key={itemIdx}>
                {renderTextWithFormatting(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${key}`} className={`list-decimal list-inside space-y-1.5 my-3 pl-2 leading-relaxed ${isAi ? 'text-slate-300' : 'text-white'}`}>
            {currentList.items.map((item, itemIdx) => (
              <li key={itemIdx}>
                {renderTextWithFormatting(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  const flushAll = (key) => {
    flushParagraph(key);
    flushTable(key);
    flushList(key);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Table parsing
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushParagraph(i);
      flushList(i);

      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        continue;
      }

      if (!currentTable) {
        currentTable = {
          headers: cells,
          rows: [],
        };
      } else {
        const rowCells = [...cells];
        while (rowCells.length < currentTable.headers.length) {
          rowCells.push('');
        }
        currentTable.rows.push(rowCells.slice(0, currentTable.headers.length));
      }
    }
    // 2. Unordered list parsing
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph(i);
      flushTable(i);

      const itemText = trimmed.slice(2).trim();
      if (currentList && currentList.type === 'ul') {
        currentList.items.push(itemText);
      } else {
        flushList(i);
        currentList = {
          type: 'ul',
          items: [itemText],
        };
      }
    }
    // 3. Ordered list parsing
    else if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph(i);
      flushTable(i);

      const match = trimmed.match(/^(\d+)\.\s(.*)/);
      const itemText = match ? match[2].trim() : trimmed;
      if (currentList && currentList.type === 'ol') {
        currentList.items.push(itemText);
      } else {
        flushList(i);
        currentList = {
          type: 'ol',
          items: [itemText],
        };
      }
    }
    // 4. Horizontal Rule
    else if (trimmed === '---' || trimmed === '***') {
      flushAll(i);
      elements.push(<hr key={`hr-${i}`} className="my-4 border-white/10" />);
    }
    // 5. Normal text / empty line
    else {
      if (trimmed === '') {
        flushAll(i);
      } else {
        flushTable(i);
        flushList(i);
        paragraphText.push(line);
      }
    }
  }

  flushAll(lines.length);

  return elements;
};

export default function Assistant() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const AVAILABLE_MODELS = [
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemma-4-26b', name: 'Gemma 4 26B' },
    { id: 'gemma-4-31b', name: 'Gemma 4 31B' }
  ];

  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite');

  // Load selected model from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('assistant_model');
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    }
  }, []);

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('assistant_model', modelId);
  };

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
          model: selectedModel,
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
      <div className="flex-grow flex w-full max-w-7xl mx-auto px-2.5 md:px-6 pt-4 pb-20 md:py-6 gap-4 md:gap-6 relative overflow-hidden h-[calc(100vh-4rem)]">

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
          className="flex-grow glass-card border border-white/5 p-3 md:p-6 flex flex-col gap-3 md:gap-4 overflow-hidden relative"
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
                  <Brain className="w-6 h-6 text-violet-400 shrink-0" />
                  <span className="hidden md:inline">Gemini Finance Assistant</span>
                  <span className="inline md:hidden">Assistant</span>
                </h1>
                <p className="text-slate-400 text-[10px] md:text-xs mt-0.5 font-semibold">
                  Real-time ledger analytics & budget optimization.
                </p>
              </div>
            </div>

            {/* Syncing Indicators & Model Selector */}
            <div className="flex items-center gap-2.5">
              {/* Model Dropdown */}
              <div className="relative flex items-center">
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="appearance-none bg-slate-950/60 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-[10px] md:text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white rounded-xl py-2 pl-3.5 pr-9 focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer shadow-md shadow-slate-950/40"
                >
                  {AVAILABLE_MODELS.map((model) => (
                    <option key={model.id} value={model.id} className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider">
                      {model.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 flex items-center text-violet-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider">
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
          <div className="flex-grow overflow-y-auto flex flex-col gap-4 md:gap-6 pr-1 md:pr-2 scrollbar-thin scroll-smooth min-h-0">
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
                      className={`flex flex-col md:flex-row gap-1.5 md:gap-3.5 text-left ${isAi ? 'justify-start items-start' : 'justify-end items-end md:items-start'}`}
                    >
                      {isAi && (
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 shadow-sm shadow-violet-950/50">
                          <Bot className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      )}

                      {!isAi && (
                        <div className="md:hidden w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-950/50">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`p-3.5 md:p-4 rounded-2xl w-full md:w-auto max-w-full md:max-w-xl text-sm leading-relaxed shadow-sm ${isAi
                          ? 'bg-slate-950/50 border border-white/5 text-slate-200 font-medium'
                          : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold'
                        }`}>
                        <div className="break-words">
                          {formatMessageContent(msg.content, isAi)}
                        </div>
                      </div>

                      {!isAi && (
                        <div className="hidden md:flex w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-950/50">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isGenerating && (
                  <div className="flex flex-col md:flex-row gap-1.5 md:gap-3.5 text-left justify-start items-start">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 animate-pulse">
                      <Bot className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="p-3.5 md:p-4 rounded-2xl w-full md:w-auto bg-slate-950/50 border border-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
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
      <footer className="hidden md:block border-t border-white/5 py-4 shrink-0 z-10 bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-[10px] text-center font-bold uppercase tracking-wider">
          Powered by {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Google Gemini'} with Database Tool Access & Session History.
        </div>
      </footer>
    </div>
  );
}
