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
  AlertCircle,
  Plus,
  Trash2,
  MessageSquare,
  Menu,
  X,
  History,
  Loader2,
  ChevronDown,
  Camera,
  Image as ImageIcon,
  Receipt,
  Check,
  CheckCheck,
  Maximize2,
  CheckCircle2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Radio,
  Activity
} from 'lucide-react';

// Interactive Transaction Proposal Card Component
function TransactionProposalCard({ initialItems, userCurrency = 'INR', onCreated }) {
  const [items, setItems] = useState(initialItems || []);
  const [status, setStatus] = useState('pending'); // 'pending' | 'saving' | 'approved' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [createdCount, setCreatedCount] = useState(0);

  const currencySymbol = userCurrency === 'USD' ? '$' : '₹';
  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const handleCreateAll = async () => {
    if (items.length === 0 || status === 'saving' || status === 'approved') return;
    setStatus('saving');
    setErrorMsg('');

    try {
      let count = 0;
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      for (const item of items) {
        const amt = parseFloat(item.amount);
        if (isNaN(amt) || amt <= 0) continue;

        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title?.trim() || 'Untitled Expense',
            amount: amt,
            type: item.type || 'SPENDING',
            useSalaryBalance: item.useSalaryBalance !== false,
            salaryMonth: item.salaryMonth || currentMonth,
            salaryYear: item.salaryYear || currentYear,
            description: item.description || 'Logged via AI Assistant Receipt OCR',
            date: item.date ? new Date(item.date).toISOString() : now.toISOString()
          })
        });

        if (res.ok) {
          count++;
        } else {
          let errText = 'Failed to create transaction.';
          try {
            const errData = await res.json();
            errText = errData.error || errData.message || errText;
          } catch (e) {
            try {
              const raw = await res.text();
              if (raw) errText = raw.slice(0, 100);
            } catch (e2) {}
          }
          throw new Error(errText);
        }
      }

      setCreatedCount(count);
      setStatus('approved');
      if (onCreated) onCreated(count, totalAmount);
    } catch (err) {
      console.error('Error creating transactions:', err);
      setErrorMsg(err.message || 'Failed to create transactions.');
      setStatus('error');
    }
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  if (items.length === 0 && status !== 'approved') return null;

  return (
    <div className="my-4 p-4 rounded-2xl bg-slate-900/90 border border-violet-500/35 shadow-2xl backdrop-blur-2xl text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-xl text-white shrink-0 shadow-md shadow-violet-600/20">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white uppercase tracking-wider truncate">
              {status === 'approved' ? 'Transactions Recorded' : 'Extracted Receipt Items for Approval'}
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold block">
              {items.length} {items.length === 1 ? 'item' : 'items'} detected • Total: <strong className="text-emerald-400 font-mono font-bold">{currencySymbol}{totalAmount.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {status === 'approved' ? (
          <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shrink-0">
            <CheckCheck className="w-3.5 h-3.5" /> Added to Passbook
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-extrabold uppercase tracking-wider rounded-full shrink-0 animate-pulse">
            Pending Approval
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Items list */}
      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <div key={idx} className="p-2.5 bg-slate-950/70 border border-white/5 hover:border-violet-500/20 rounded-xl flex items-center justify-between gap-3 transition-all">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-white/5 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                disabled={status === 'approved' || status === 'saving'}
                value={item.title}
                onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                placeholder="Item name"
                className="bg-transparent border-b border-transparent focus:border-violet-500 text-xs font-bold text-white focus:outline-none w-full truncate disabled:opacity-80"
              />
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">
                {item.type || 'SPENDING'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 font-mono text-xs font-black text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/15">
                <span>{currencySymbol}</span>
                <input
                  type="number"
                  disabled={status === 'approved' || status === 'saving'}
                  value={item.amount}
                  onChange={(e) => handleUpdateItem(idx, 'amount', e.target.value)}
                  className="bg-transparent text-xs font-black text-emerald-400 focus:outline-none w-14 text-right disabled:opacity-80"
                />
              </div>

              {status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      {status !== 'approved' ? (
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400 font-semibold">
            Deducts from active salary balance
          </span>
          <button
            type="button"
            disabled={status === 'saving' || items.length === 0}
            onClick={handleCreateAll}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {status === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Recording in Passbook...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Approve & Create All ({currencySymbol}{totalAmount.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-400 font-bold">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Successfully recorded {createdCount} entries into your ledger.
          </span>
        </div>
      )}
    </div>
  );
}

// Parse message content to render markdown elements (bold, inline code, tables, lists, HR, and interactive proposal cards)
const formatMessageContent = (content, isAi = false, userCurrency = 'INR', onCreated = null) => {
  if (!content) return [];

  // Check for embedded proposal JSON blocks
  const proposalRegex = /```(?:json:transaction_proposal|json)\s*([\s\S]*?\{[\s\S]*?"items"[\s\S]*?\})\s*```/;
  const proposalMatch = content.match(proposalRegex);

  let proposalItems = null;
  let textToRender = content;

  if (proposalMatch) {
    try {
      const parsed = JSON.parse(proposalMatch[1]);
      if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
        proposalItems = parsed.items;
      }
    } catch (err) {
      console.error('Error parsing transaction proposal JSON:', err);
    }
    // Remove the raw proposal code block from textual render
    textToRender = content.replace(proposalRegex, '').trim();
  }

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

  const lines = textToRender.split('\n');
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

  // If there are proposed transactions, append the interactive proposal card
  if (proposalItems) {
    elements.push(
      <TransactionProposalCard
        key="proposal-card"
        initialItems={proposalItems}
        userCurrency={userCurrency}
        onCreated={onCreated}
      />
    );
  }

  return elements;
};

export default function Assistant() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const AVAILABLE_MODELS = [
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite' },
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

  // Live Speech Recognition & Sarvam AI Voice State
  const [isListening, setIsListening] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const [audioLoadingMsgIdx, setAudioLoadingMsgIdx] = useState(null);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAudioPlayerRef = useRef(null);

  // Image Upload / Receipt OCR State
  const [attachedImage, setAttachedImage] = useState(null); // { data: base64, mimeType, name, previewUrl, originalSizeStr, compressedSizeStr, isCompressed }
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  // Scroll Container Ref
  const messagesEndRef = useRef(null);

  // Suggested Prompts list
  const suggestions = [
    { text: "Scan my grocery / restaurant receipt image", icon: Receipt, isImagePrompt: true },
    { text: "Where did I spend the most money this month?", icon: TrendingUp },
    { text: "Compare this month spending with last month.", icon: LineChart },
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
          content: "Yo! 👋 I am your Antigravity Finance AI. You can ask me anything about your ledger, or upload a photo of your receipt/bill to extract items and log transactions directly into your passbook!"
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
              content: "Yo! 👋 Welcome back to this chat session. Ask me questions about your ledger or upload a receipt photo to scan and log transactions!"
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
  }, [messages, isGenerating, isLoadingMessages, attachedImage]);

  // Helper to format file sizes
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Compress & prepare large mobile camera images on client before state assignment
  const compressClientImage = (file) => {
    return new Promise((resolve) => {
      const originalSize = file?.size || 0;
      const fileName = file?.name || 'Receipt Image';
      const fileMime = file?.type || 'image/jpeg';

      const reader = new FileReader();

      reader.onerror = () => {
        resolve({
          data: '',
          previewUrl: '',
          name: fileName,
          mimeType: fileMime,
          originalSizeStr: formatFileSize(originalSize),
          compressedSizeStr: formatFileSize(originalSize),
          isCompressed: false,
        });
      };

      reader.onload = (e) => {
        const dataUrl = e.target?.result || '';

        // If file is already small (< 1MB) or reading failed, no client canvas downscaling needed
        if (!dataUrl || originalSize < 1024 * 1024) {
          resolve({
            data: dataUrl,
            previewUrl: dataUrl,
            name: fileName,
            mimeType: fileMime,
            originalSizeStr: formatFileSize(originalSize),
            compressedSizeStr: formatFileSize(originalSize),
            isCompressed: false,
          });
          return;
        }

        // Downscale large mobile camera photo using offscreen canvas to prevent mobile memory spikes
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          img.onerror = () => {
            // Fallback if image fails to decode on canvas (e.g. raw HEIC in some browsers)
            resolve({
              data: dataUrl,
              previewUrl: dataUrl,
              name: fileName,
              mimeType: fileMime,
              originalSizeStr: formatFileSize(originalSize),
              compressedSizeStr: formatFileSize(originalSize),
              isCompressed: false,
            });
          };

          img.onload = () => {
            try {
              const MAX_DIM = 2048; // Crisp client-side max dimension
              let width = img.naturalWidth || img.width || 0;
              let height = img.naturalHeight || img.height || 0;

              if (width <= 0 || height <= 0) {
                resolve({
                  data: dataUrl,
                  previewUrl: dataUrl,
                  name: fileName,
                  mimeType: fileMime,
                  originalSizeStr: formatFileSize(originalSize),
                  compressedSizeStr: formatFileSize(originalSize),
                  isCompressed: false,
                });
                return;
              }

              if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                  height = Math.round((height * MAX_DIM) / width);
                  width = MAX_DIM;
                } else {
                  width = Math.round((width * MAX_DIM) / height);
                  height = MAX_DIM;
                }
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve({
                  data: dataUrl,
                  previewUrl: dataUrl,
                  name: fileName,
                  mimeType: fileMime,
                  originalSizeStr: formatFileSize(originalSize),
                  compressedSizeStr: formatFileSize(originalSize),
                  isCompressed: false,
                });
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);

              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              const approxCompressedBytes = Math.round((compressedDataUrl.length - 22) * 0.75);

              resolve({
                data: compressedDataUrl,
                previewUrl: compressedDataUrl,
                name: fileName,
                mimeType: 'image/jpeg',
                originalSizeStr: formatFileSize(originalSize),
                compressedSizeStr: formatFileSize(approxCompressedBytes),
                isCompressed: true,
              });
            } catch (err) {
              console.warn('Canvas compression error, falling back:', err);
              resolve({
                data: dataUrl,
                previewUrl: dataUrl,
                name: fileName,
                mimeType: fileMime,
                originalSizeStr: formatFileSize(originalSize),
                compressedSizeStr: formatFileSize(originalSize),
                isCompressed: false,
              });
            }
          };

          img.src = dataUrl;
        } catch (err) {
          console.warn('Image loading error, falling back:', err);
          resolve({
            data: dataUrl,
            previewUrl: dataUrl,
            name: fileName,
            mimeType: fileMime,
            originalSizeStr: formatFileSize(originalSize),
            compressedSizeStr: formatFileSize(originalSize),
            isCompressed: false,
          });
        }
      };

      reader.readAsDataURL(file);
    });
  };

  // Handle Image File Selection (Camera / File Picker)
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name || '');
    if (!isImage) {
      setError('Please select a valid image file (PNG, JPG, WEBP, HEIC).');
      return;
    }

    setIsProcessingImage(true);
    setError('');

    try {
      const processed = await compressClientImage(file);
      if (processed && processed.data) {
        setAttachedImage(processed);
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process image file.');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  // Handle Paste Event from Clipboard (Ctrl+V / Cmd+V)
  const handlePaste = async (e) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          setIsProcessingImage(true);
          setError('');
          try {
            const processed = await compressClientImage(file);
            if (processed && processed.data) {
              setAttachedImage({
                ...processed,
                name: 'Pasted Image',
              });
            }
          } catch (err) {
            console.error('Error processing pasted image:', err);
            setError('Failed to process pasted image.');
          } finally {
            setIsProcessingImage(false);
          }
        }
      }
    }
  };

  // Remove attached image
  const handleRemoveAttachedImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
                content: "Yo! 👋 I am your Antigravity Finance AI. You can ask me anything about your ledger, or upload a photo of your receipt/bill to extract items and log transactions directly into your passbook!"
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
  const sendMessage = async (textToSend, customImage = null) => {
    const imageToSend = customImage || attachedImage;
    const prompt = textToSend !== undefined ? textToSend : input;

    if ((!prompt.trim() && !imageToSend) || isGenerating) return;

    setError('');
    setInput('');
    const imageToClear = attachedImage;
    setAttachedImage(null);
    setIsGenerating(true);

    let currentSessionId = activeSessionId;

    // 1. If no active session exists, automatically create one first!
    if (!currentSessionId) {
      try {
        const sessionTitle = prompt.trim() || (imageToSend ? 'Receipt Scan' : 'New Chat');
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: sessionTitle }),
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
        setAttachedImage(imageToClear);
        return;
      }
    }

    // 2. Append User Message to UI
    const defaultMsg = imageToSend && !prompt.trim()
      ? "Please scan this receipt/bill image, extract all purchased items with prices, and ask for my approval before creating transactions."
      : prompt.trim();

    const userMessage = {
      role: 'user',
      content: defaultMsg,
      imagePreview: imageToSend?.previewUrl || null,
    };

    const cleanMessages = messages.filter(m => m.id || !m.content.includes("Yo! 👋 I am your Antigravity Finance AI."));
    const updatedMessages = [...cleanMessages, userMessage];
    setMessages(updatedMessages);

    try {
      const payload = {
        messages: updatedMessages,
        sessionId: currentSessionId,
        model: selectedModel,
      };

      if (imageToSend) {
        payload.image = {
          data: imageToSend.data,
          mimeType: imageToSend.mimeType || 'image/jpeg',
        };
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = 'Failed to generate response.';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (e) {
          try {
            const rawText = await res.text();
            if (rawText) errorMsg = rawText.slice(0, 120);
          } catch (e2) {}
        }
        throw new Error(errorMsg);
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
      setError(err.message || 'Something went wrong. Please ensure your GEMINI_API_KEY is configured in the backend.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Live Speech-to-Text (Sarvam AI Saaras v3 + Web Speech Fallback)
  const toggleSpeechRecognition = async () => {
    if (typeof window === 'undefined') return;

    if (isListening) {
      // User is stopping recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    // Try Sarvam AI Audio Recording via MediaRecorder
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];

        // Pick supported mime type with safe fallbacks
        let mediaRecorder;
        try {
          let mimeType = '';
          if (typeof MediaRecorder.isTypeSupported === 'function') {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
              mimeType = 'audio/webm';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              mimeType = 'audio/mp4';
            }
          }
          mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        } catch (recErr) {
          mediaRecorder = new MediaRecorder(stream);
        }

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop all mic tracks
          stream.getTracks().forEach(track => {
            try { track.stop(); } catch (e) {}
          });

          if (audioChunksRef.current.length === 0) return;

          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          setIsTranscribingAudio(true);
          setError('');

          try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'speech.webm');

            const res = await fetch('/api/audio/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data.transcript) {
                setInput(prev => prev ? `${prev} ${data.transcript}` : data.transcript);
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              console.warn('Sarvam transcription fallback:', errData?.error);
            }
          } catch (sttErr) {
            console.error('Sarvam STT Error:', sttErr);
          } finally {
            setIsTranscribingAudio(false);
          }
        };

        mediaRecorder.start(200);
        setIsListening(true);
        setError('');
        return;
      } catch (micErr) {
        console.warn('MediaRecorder mic access error, falling back to Web Speech API:', micErr);
      }
    }

    // Fallback: Web Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Microphone access is not supported in this browser. Please enable microphone permissions or use Chrome/Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      try {
        recognition.lang = 'hi-IN'; // Multi-lingual (Hindi & Indian English)
      } catch (e) {
        try { recognition.lang = 'en-US'; } catch (e2) {}
      }
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInput(currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setError(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech init error:', err);
      setIsListening(false);
    }
  };

  // Sarvam AI Text-to-Speech (Bulbul v3 / Web Speech Synthesis fallback)
  const handleSpeak = async (text, idx) => {
    if (typeof window === 'undefined') return;

    // If already speaking this message, stop it
    if (speakingMsgIdx === idx) {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
        activeAudioPlayerRef.current = null;
      }
      window.speechSynthesis?.cancel();
      setSpeakingMsgIdx(null);
      return;
    }

    // Stop any active playing audio
    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
      activeAudioPlayerRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setAudioLoadingMsgIdx(idx);
    setError('');

    try {
      // 1. Attempt high-fidelity Sarvam AI Bulbul v3 Text-to-Speech
      const res = await fetch('/api/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          language_code: 'hi-IN',
          speaker: 'shubh',
          pace: 1.05,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          activeAudioPlayerRef.current = audio;

          audio.onended = () => {
            setSpeakingMsgIdx(null);
            activeAudioPlayerRef.current = null;
          };

          audio.onerror = () => {
            setSpeakingMsgIdx(null);
            activeAudioPlayerRef.current = null;
          };

          setSpeakingMsgIdx(idx);
          await audio.play();
          setAudioLoadingMsgIdx(null);
          return;
        }
      }
    } catch (sarvamErr) {
      console.warn('Sarvam TTS unavailable, falling back to browser Web Speech:', sarvamErr);
    } finally {
      setAudioLoadingMsgIdx(null);
    }

    // 2. Fallback to Browser Speech Synthesis
    if (window.speechSynthesis) {
      const cleanText = text
        .replace(/```json:transaction_proposal[\s\S]*?```/g, 'I have prepared a transaction approval list below for your review.')
        .replace(/[*_#`]/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setSpeakingMsgIdx(null);
      utterance.onerror = () => setSpeakingMsgIdx(null);

      setSpeakingMsgIdx(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = (text, idx) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    }
  };

  // Cleanup speech synthesis & audio player on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
        if (activeAudioPlayerRef.current) {
          activeAudioPlayerRef.current.pause();
        }
        recognitionRef.current?.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }
    };
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
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

      {/* Decorative Ambient Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* AI Assistant Dedicated Page Header Bar - Positioned right below Top Navbar */}
      <div className="w-full border-b border-white/[0.08] bg-[#030712]/90 backdrop-blur-2xl shrink-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggle button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 border border-white/10 hover:border-violet-500/20 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
              title={isSidebarOpen ? "Hide Chat Logs" : "Show Chat Logs"}
            >
              {isSidebarOpen ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Menu className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-xl text-white shadow-md shadow-violet-600/25 shrink-0 flex items-center justify-center">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
              </span>
              <div className="min-w-0 text-left">
                <h1 className="text-sm md:text-lg font-black text-white tracking-tight truncate flex items-center gap-2">
                  <span>AI Assistant</span>
                  <span className="hidden sm:inline text-xs font-bold text-slate-400">• Vision & Finance</span>
                </h1>
                <p className="text-slate-400 text-[10px] md:text-xs font-semibold truncate hidden xs:block sm:block">
                  Receipt OCR extraction & real-time ledger intelligence.
                </p>
              </div>
            </div>
          </div>

          {/* Syncing Indicators & Model Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex items-center">
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="appearance-none bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-white/20 text-[10px] md:text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white rounded-xl py-1.5 md:py-2 pl-3 pr-8 md:pr-9 focus:outline-none focus:border-violet-500/50 transition-all cursor-pointer shadow-md shadow-slate-950/40"
              >
                {AVAILABLE_MODELS.map((model) => (
                  <option key={model.id} value={model.id} className="bg-slate-950 text-slate-300 font-bold uppercase tracking-wider">
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 md:right-3 flex items-center text-violet-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-xl text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Sarvam AI Audio
            </span>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Ledger Linked
            </span>
          </div>
        </div>
      </div>

      {/* 1. MOBILE SLIDE-OVER DRAWER (Rendered at root level outside overflow container) */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <div className="fixed inset-0 z-[100] md:hidden overflow-hidden">
            {/* Backdrop Overlay */}
            <motion.div
              key="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            {/* Slide-out Drawer Panel */}
            <motion.aside
              key="mobile-drawer-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="absolute top-0 left-0 bottom-0 w-[85vw] max-w-[320px] bg-[#030712]/98 backdrop-blur-2xl border-r border-white/10 shadow-[20px_0_50px_rgba(0,0,0,0.9)] flex flex-col justify-between p-4 z-10"
              style={{
                paddingTop: 'max(16px, env(safe-area-inset-top, 0px))',
                paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
              }}
            >
              {/* Header inside Mobile Drawer */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 font-bold text-white">
                  <span className="p-1.5 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-lg text-white">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <span className="text-sm">Chat History & Logs</span>
                </div>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Create New Chat Session Button */}
              <button
                onClick={() => {
                  handleCreateSession();
                  setIsSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 my-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-md shadow-violet-600/20 cursor-pointer uppercase shrink-0 active:scale-98"
              >
                <Plus className="w-4 h-4" /> New Chat Session
              </button>

              {/* Scrollable list of sessions */}
              <div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin my-1">
                {isLoadingSessions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                    <span>Syncing past logs...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs font-semibold text-slate-500">
                    No active sessions. Start a new session or upload a receipt to chat!
                  </div>
                ) : (
                  sessions.map((s) => {
                    const isActive = activeSessionId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSessionId(s.id);
                          setIsSidebarOpen(false);
                        }}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl border transition-all text-left text-xs font-bold select-none group cursor-pointer relative overflow-hidden ${
                          isActive
                            ? 'bg-violet-600/20 border-violet-500/50 text-violet-100 shadow-md shadow-violet-950/40'
                            : 'bg-slate-950/60 hover:bg-slate-900/80 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-8">
                          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                          <span className="truncate tracking-wide">{s.title || 'New Chat'}</span>
                        </div>

                        {/* In-place Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(e, s.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                          title="Delete Session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mobile Drawer Bottom Info */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 font-semibold shrink-0">
                <span>{sessions.length} Saved Sessions</span>
                <span className="text-violet-400 font-bold uppercase">{selectedModel}</span>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Split Layout Container */}
      <div className="flex-grow flex w-full max-w-7xl mx-auto px-0 md:px-6 pt-2 md:pt-4 pb-0 md:pb-6 gap-4 md:gap-6 relative overflow-hidden h-[calc(100dvh-7.8rem)]">

        {/* 2. DESKTOP IN-LINE SIDEBAR PANEL */}
        <AnimatePresence>
          {!isMobile && isSidebarOpen && (
            <motion.aside
              layout
              key="desktop-sidebar-aside"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-card border border-white/5 flex flex-col p-4 shrink-0 overflow-hidden h-full"
            >
              {/* Header with New Chat Button */}
              <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-violet-400" /> Chat Logs
                </span>
              </div>

              {/* Create new chat session button */}
              <button
                onClick={handleCreateSession}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mb-4 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-xl text-xs font-black tracking-wide transition-all shadow-md shadow-violet-600/15 cursor-pointer uppercase shrink-0 active:scale-98"
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
                    No active sessions. Send a message or upload a receipt to start!
                  </div>
                ) : (
                  sessions.map((s) => {
                    const isActive = activeSessionId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setActiveSessionId(s.id)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl border transition-all text-left text-xs font-bold select-none group cursor-pointer relative overflow-hidden ${
                          isActive
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
          className="flex-grow md:glass-card md:border md:border-white/5 p-3 md:p-6 flex flex-col justify-between overflow-hidden relative h-full"
        >

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center justify-between gap-4 shrink-0 text-left mb-2">
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
          <div className="flex-grow overflow-y-auto flex flex-col gap-4 md:gap-6 px-1 md:px-0 pt-2 pb-36 md:pb-4 scrollbar-thin scroll-smooth min-h-0">
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
                <div className="flex flex-col gap-2 px-4">
                  <h3 className="text-white text-lg font-black tracking-tight">AI Vision & Personal Finance Assistant</h3>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                    Upload receipt/bill photos to automatically extract item prices, or ask questions to audit your balances, salary deductions, and active lending logs.
                  </p>
                </div>

                {/* Suggestions Tags */}
                <div className="w-full flex flex-col gap-2 mt-4 px-2">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider text-left pl-2">Quick Actions & Suggestions</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {suggestions.map((s, idx) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (s.isImagePrompt) {
                              fileInputRef.current?.click();
                            } else {
                              sendMessage(s.text);
                            }
                          }}
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
              <div className="flex flex-col gap-5 md:gap-6">
                {messages.map((msg, idx) => {
                  const isAi = msg.role === 'assistant';
                  const isStreamingCurrent = isAi && isGenerating && idx === messages.length - 1;

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col md:flex-row gap-1.5 md:gap-3.5 text-left ${isAi ? 'justify-start items-start' : 'justify-end items-end md:items-start'}`}
                    >
                      {isAi && (
                        <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm shadow-violet-950/50 transition-all ${
                          isStreamingCurrent
                            ? 'bg-violet-600/30 border-violet-500 text-violet-300 animate-pulse'
                            : 'bg-violet-600/20 border-violet-500/20 text-violet-400'
                        }`}>
                          <Bot className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      )}

                      {!isAi && (
                        <div className="md:hidden w-8 h-8 rounded-xl bg-cyan-600/20 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-950/50">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`p-3.5 md:p-4 rounded-2xl w-full md:w-auto max-w-full md:max-w-xl text-sm leading-relaxed shadow-sm transition-all ${
                        isAi
                          ? isStreamingCurrent
                            ? 'bg-slate-950/80 border border-violet-500/40 text-slate-200 font-medium shadow-lg shadow-violet-950/30'
                            : 'bg-slate-950/60 border border-white/5 text-slate-200 font-medium'
                          : 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold'
                        }`}>

                        {/* Live Streaming Gemini Transcript Banner */}
                        {isStreamingCurrent && (
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-violet-500/20 text-[10px] font-bold text-violet-300">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                              <Radio className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                              <span>Live Gemini Transcript Streaming...</span>
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">{selectedModel}</span>
                          </div>
                        )}

                        {/* If user attached an image, render preview inside bubble */}
                        {!isAi && msg.imagePreview && (
                          <div className="mb-3">
                            <img
                              src={msg.imagePreview}
                              alt="Attached Receipt"
                              onClick={() => setLightboxImage(msg.imagePreview)}
                              className="max-h-48 rounded-xl object-cover border border-white/20 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                            />
                            <span className="text-[10px] text-white/80 font-bold block mt-1">Receipt Attachment (Click to zoom)</span>
                          </div>
                        )}

                        <div className="break-words">
                          {formatMessageContent(msg.content, isAi, user?.currency, () => loadSessions(false))}
                          
                          {/* Live typing cursor during streaming */}
                          {isStreamingCurrent && (
                            <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-1 translate-y-0.5 rounded-sm shadow-[0_0_8px_rgba(139,92,246,0.8)]"></span>
                          )}
                        </div>

                        {/* Completed AI Transcript Actions */}
                        {isAi && msg.content && !isStreamingCurrent && (
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5 text-[10px] text-slate-400 font-semibold">
                            <span className="flex items-center gap-1.5 text-slate-500 text-[9px] uppercase tracking-wider font-extrabold">
                              <Sparkles className="w-3 h-3 text-violet-400" />
                              <span>Gemini Transcript</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Read Aloud TTS Speaker (Sarvam AI Bulbul v3) */}
                              <button
                                type="button"
                                onClick={() => handleSpeak(msg.content, idx)}
                                disabled={audioLoadingMsgIdx === idx}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  speakingMsgIdx === idx
                                    ? 'bg-violet-500/25 text-violet-300 animate-pulse'
                                    : audioLoadingMsgIdx === idx
                                      ? 'bg-violet-500/15 text-violet-400'
                                      : 'hover:bg-white/10 text-slate-400 hover:text-white'
                                }`}
                                title={
                                  audioLoadingMsgIdx === idx
                                    ? "Synthesizing Sarvam AI voice..."
                                    : speakingMsgIdx === idx
                                      ? "Stop speaking"
                                      : "Listen to transcript (Sarvam AI Voice)"
                                }
                              >
                                {audioLoadingMsgIdx === idx ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                                ) : speakingMsgIdx === idx ? (
                                  <VolumeX className="w-3.5 h-3.5" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Copy Transcript */}
                              <button
                                type="button"
                                onClick={() => handleCopyTranscript(msg.content, idx)}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy full transcript"
                              >
                                {copiedMsgIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isAi && (
                        <div className="hidden md:flex w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm shadow-cyan-950/50">
                          <UserIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isGenerating && !messages[messages.length - 1]?.content && (
                  <div className="flex flex-col md:flex-row gap-1.5 md:gap-3.5 text-left justify-start items-start animate-fade-in">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 animate-pulse">
                      <Bot className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div className="p-3.5 md:p-4 rounded-2xl w-full md:w-auto bg-slate-950/70 border border-violet-500/20 text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 shadow-md shadow-violet-950/30">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Analyzing Vision & Ledger Data...</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pinned Input Container: Fixed on mobile right above bottom navbar, cleanly integrated at bottom on desktop */}
          <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+58px)] left-0 right-0 z-40 px-3 py-2.5 bg-[#030712]/95 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-10px_35px_rgba(0,0,0,0.8)] md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none md:border-t md:border-white/5 md:shadow-none md:pt-3 space-y-2">
            
            {/* Attached Image Preview Pill */}
            {attachedImage && (
              <div className="flex items-center justify-between gap-3 p-2.5 px-3 bg-violet-950/50 border border-violet-500/30 rounded-2xl animate-fade-in text-left shadow-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={attachedImage.previewUrl}
                    alt="Receipt Preview"
                    onClick={() => setLightboxImage(attachedImage.previewUrl)}
                    className="w-11 h-11 rounded-xl object-cover border border-violet-500/40 shadow-sm shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-white truncate max-w-[150px] md:max-w-[220px] block">
                        {attachedImage.name || 'Receipt Image Attached'}
                      </span>
                      {attachedImage.isCompressed ? (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-extrabold rounded-md shrink-0">
                          {attachedImage.originalSizeStr} → {attachedImage.compressedSizeStr}
                        </span>
                      ) : attachedImage.originalSizeStr ? (
                        <span className="px-1.5 py-0.5 bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[9px] font-extrabold rounded-md shrink-0">
                          {attachedImage.originalSizeStr}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-violet-300 font-semibold flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>Optimized for Gemini AI Vision</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveAttachedImage}
                  className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Form Input Row */}
            <form onSubmit={handleFormSubmit} className="flex gap-2 items-center">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Camera / Image Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating || isLoadingMessages || isTranscribingAudio || isProcessingImage}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isProcessingImage
                    ? 'bg-violet-600/20 border-violet-500 text-violet-300 animate-pulse'
                    : attachedImage
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-md shadow-violet-900/30'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
                title={isProcessingImage ? "Compressing image..." : "Attach receipt image or camera photo (or paste from clipboard)"}
              >
                {isProcessingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>

              {/* Live Speech-to-Text Microphone Button (Sarvam AI Saaras v3) */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                disabled={isGenerating || isLoadingMessages || isTranscribingAudio}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isListening
                    ? 'bg-rose-500/25 border-rose-500 text-rose-300 animate-pulse shadow-md shadow-rose-900/50'
                    : isTranscribingAudio
                      ? 'bg-violet-600/25 border-violet-500 text-violet-300 animate-pulse'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                }`}
                title={
                  isListening
                    ? "Recording audio... (Click to transcribe with Sarvam AI)"
                    : isTranscribingAudio
                      ? "Sarvam AI Saaras v3 transcribing..."
                      : "Live Voice-to-Text (Sarvam AI Saaras v3)"
                }
              >
                {isTranscribingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                ) : isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  isListening
                    ? "🎙️ Recording speech (Click mic again to transcribe)..."
                    : isTranscribingAudio
                      ? "⚡ Sarvam AI Saaras v3 transcribing speech..."
                      : isGenerating
                        ? "Gemini is scanning ledger..."
                        : attachedImage
                          ? "Add optional notes or hit send..."
                          : "Ask anything, speak (Sarvam Mic) or upload receipt..."
                }
                className={`flex-grow pl-4 pr-3 py-3 md:py-3.5 bg-slate-950/80 border rounded-2xl text-white placeholder-slate-600 text-sm focus:outline-none font-semibold transition-all ${
                  isListening
                    ? 'border-rose-500/50 ring-2 ring-rose-500/20'
                    : isTranscribingAudio
                      ? 'border-violet-500/50 ring-2 ring-violet-500/20'
                      : 'border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20'
                }`}
                disabled={isGenerating || isLoadingMessages || isTranscribingAudio}
              />

              <button
                type="submit"
                disabled={isGenerating || isLoadingMessages || isTranscribingAudio || (!input.trim() && !attachedImage)}
                className="p-3 md:p-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white rounded-2xl transition-all btn-glow shadow-md shadow-violet-600/15 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

        </motion.main>
      </div>

      {/* Lightbox Modal for Receipt Image Preview */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl">
            <img
              src={lightboxImage}
              alt="Receipt Zoom"
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-950/80 text-white rounded-full hover:bg-rose-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="hidden md:block border-t border-white/5 py-4 shrink-0 z-10 bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 text-slate-600 text-[10px] text-center font-bold uppercase tracking-wider">
          Powered by {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || 'Google Gemini'} with Multimodal Receipt OCR, Database Tools & Ledger Sync.
        </div>
      </footer>
    </div>
  );
}
