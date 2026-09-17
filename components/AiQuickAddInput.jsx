'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  ArrowRight,
  Mic,
  MicOff,
  X,
  Loader2,
  Bot,
  Plus,
  Coins
} from 'lucide-react';
import { parseTransactionPrompt } from '@/lib/quickParser';

const PLACEHOLDER_EXAMPLES = [
  '10rs cocacola',
  '₹250 pizza swiggy',
  'Lent 1000 to Rahul',
  'Spent 150 on fuel',
  '₹500 groceries at supermarket',
  'SIP 2500 in mutual fund',
  'Borrowed 2000 from Amit',
  'Chai and samosa 40'
];

export default function AiQuickAddInput({
  onPrefill,
  dynamicPresets = [],
  formatCurrency,
  onOpenCustomModal,
  isCompact = false
}) {
  const [inputPrompt, setInputPrompt] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Rotating placeholder effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  // Web Speech API initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Default to Indian English / Hinglish

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputPrompt(transcript);
            // Auto trigger parse on voice capture
            handleProcessPrompt(transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }
  };

  const handleProcessPrompt = async (textToProcess) => {
    const query = (textToProcess || inputPrompt).trim();
    if (!query) return;

    setIsProcessing(true);

    try {
      // 1. Fast local NLP fallback baseline
      const localResult = parseTransactionPrompt(query);

      // 2. Call backend AI quick-parse endpoint with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      try {
        const res = await fetch('/api/ai/quick-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: query }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data?.transaction) {
            onPrefill?.(data.transaction);
            setInputPrompt('');
            return;
          }
        }
      } catch (e) {
        // Fallback to local NLP if network or API times out
      }

      // If network call skipped or failed, use fast local NLP result
      onPrefill?.(localResult);
      setInputPrompt('');
    } catch (err) {
      console.error('Error processing prompt:', err);
      // Ensure local parser opens drawer regardless
      const fallback = parseTransactionPrompt(query);
      onPrefill?.(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessPrompt();
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {/* 🔮 AI Magic Prompt Input Container */}
      <div className="relative group bg-[var(--background-elevated)] border border-[var(--border-default)] hover:border-indigo-500/50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 p-2 sm:p-2.5 rounded-2xl shadow-sm transition-all duration-200">

        {/* Subtle glowing ambient gradient behind input */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" />

        <div className="relative flex items-center gap-2 sm:gap-3">
          {/* AI Sparkles / Bot Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 select-none">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
            <span className="text-[11px] font-bold tracking-tight hidden sm:inline bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              AI Quick Add
            </span>
          </div>

          {/* Text Input with Animated Placeholder */}
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={`e.g. "${PLACEHOLDER_EXAMPLES[placeholderIndex]}"`}
              className="w-full bg-transparent text-xs sm:text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none font-medium pr-7 transition-colors"
            />

            {/* Clear button when text entered */}
            {inputPrompt && (
              <button
                type="button"
                onClick={() => setInputPrompt('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] p-1 rounded-md transition-colors"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Hub: Mic & Prefill Submit Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice Input Mic Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2 rounded-xl text-xs transition-all cursor-pointer ${isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-base)] border border-transparent hover:border-[var(--border-default)]'
                  }`}
                title={isListening ? 'Listening... click to stop' : 'Voice entry'}
              >
                {isListening ? <Mic className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* AI Prefill Submit CTA */}
            <button
              type="button"
              onClick={() => handleProcessPrompt()}
              disabled={isProcessing || !inputPrompt.trim()}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${inputPrompt.trim()
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25 active:scale-95'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20'
                }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Prefilling...</span>
                </>
              ) : (
                <>
                  {/* <Zap className="w-3.5 h-3.5 text-amber-400" /> */}
                  {/* <span>Prefill Entry</span> */}
                  <ArrowRight className="w-6 h-6 ml-0.5 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ⚡ 1-Tap Dynamic Presets Chips Strip */}
      {/* <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 select-none">
        <span className="text-[11px] font-mono font-bold text-amber-500 flex items-center gap-1 shrink-0">
          <Zap className="w-3 h-3" /> Quick 1-Tap:
        </span>

        {dynamicPresets.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onPrefill?.({
                amount: preset.amount,
                type: preset.type,
                title: preset.title,
                description: `Quick added ${preset.title}`,
                useSalaryBalance: preset.type === 'SPENDING',
                isAiPrefilled: false
              });
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--background-base)] hover:border-indigo-500/50 border border-[var(--border-default)] text-[var(--foreground)] hover:text-indigo-500 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
            title={`Quick log ${preset.title}`}
          >
            <span>{preset.icon}</span>
            <span className="truncate max-w-[100px] sm:max-w-none">{preset.label}</span>
            {formatCurrency && (
              <span className="text-[10px] font-mono text-[var(--foreground-muted)]">
                {formatCurrency(preset.amount)}
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={onOpenCustomModal}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-3 h-3" /> Blank Entry
        </button>
      </div> */}
    </div>
  );
}
