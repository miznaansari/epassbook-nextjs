'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Mic,
  MicOff,
  X,
  Loader2,
  Bot,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';

const PLACEHOLDER_EXAMPLES = [
  'Move ₹649 Spotify from Needs to Wants',
  'Gym membership ₹1500 is essential Need, not Want',
  'Treat ₹2500 SIP as Savings',
  'Classify all dining out and cafe orders as Wants',
  'Move Blinkit groceries ₹850 to Needs',
  'Put health insurance and doctor fees in Needs'
];

const QUICK_PRESETS = [
  { label: '🍕 Food/Dining to Wants', prompt: 'Classify all restaurant, cafe and dining out spending as Wants' },
  { label: '🏠 Groceries & Rent as Needs', prompt: 'Ensure all rent, electricity, wifi, and grocery bills are in Needs' },
  { label: '📈 All SIPs to Savings', prompt: 'Make sure all mutual fund and SIP deposits are counted in Savings' },
  { label: '🎯 Re-balance 50/30/20', prompt: 'Strictly re-balance every item according to essential Needs 50%, Wants 30%, Savings 20%' }
];

export default function Ai503020PromptInput({
  onSubmitPrompt,
  onApplyPrompt,
  isLoading = false,
  loading = false,
  remainingRefreshes = 5,
  maxDailyRefreshes = 5,
  onDirectRefresh = null,
  isCompact = false
}) {
  const activeLoading = isLoading || loading;
  const dispatchPrompt = onSubmitPrompt || onApplyPrompt;
  const [inputPrompt, setInputPrompt] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Rotating placeholder effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3600);
    return () => clearInterval(interval);
  }, []);

  // Web Speech API initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        try {
          recognition.lang = 'hi-IN'; // Multi-lingual Indian English / Hinglish
        } catch (e) {
          try { recognition.lang = 'en-US'; } catch (e2) {}
        }

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInputPrompt(transcript);
            handleSubmit(transcript);
          }
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
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

  const handleSubmit = (overrideText = null) => {
    const textToSend = overrideText !== null ? overrideText : inputPrompt;
    if (!textToSend.trim() || activeLoading) return;
    if (remainingRefreshes <= 0) return;

    if (dispatchPrompt) {
      dispatchPrompt(textToSend.trim());
    }
    setInputPrompt('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isLimitReached = remainingRefreshes <= 0;

  return (
    <div className={`w-full bg-[var(--background-base)] border border-purple-500/25 dark:border-purple-500/30 rounded-2xl ${isCompact ? 'p-3' : 'p-3.5 sm:p-4'} shadow-sm backdrop-blur-md space-y-3 text-left`}>
      {/* Header bar with Quota & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <span>AI 50/30/20 Refinement Prompt</span>
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-1.5 py-0.2 rounded">
                Interactive Override
              </span>
            </h4>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Ask AI to re-classify items or customize your Needs, Wants, and Savings rules.
            </p>
          </div>
        </div>

        {/* Daily Quota Counter Badge & Direct Re-Run Button */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${
            isLimitReached
              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
          }`}>
            <Sparkles className="w-2.5 h-2.5" />
            <span>{remainingRefreshes}/{maxDailyRefreshes} Refreshes Today</span>
          </span>

          {onDirectRefresh && (
            <button
              type="button"
              onClick={onDirectRefresh}
              disabled={activeLoading || isLimitReached}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[var(--surface)] dark:hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] disabled:opacity-40 transition-colors cursor-pointer"
              title="Re-run AI classification"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${activeLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Prompt Input Pill */}
      <div className={`relative flex items-center bg-white dark:bg-[var(--background-elevated)] border rounded-2xl transition-all shadow-2xs ${
        isListening
          ? 'border-rose-500 ring-2 ring-rose-500/20'
          : activeLoading
            ? 'border-purple-500 ring-2 ring-purple-500/20'
            : isLimitReached
              ? 'border-slate-300 dark:border-white/10 opacity-75'
              : 'border-slate-200 dark:border-white/10 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20'
      }`}>
        <div className="pl-3 text-purple-500 shrink-0">
          <Bot className="w-4 h-4" />
        </div>

        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={activeLoading || isLimitReached}
          placeholder={
            isLimitReached
              ? 'Daily AI limit reached (5/5). Resets tomorrow.'
              : isListening
                ? '🎙️ Listening... (Speak your classification rule)'
                : activeLoading
                  ? 'Gemini AI is re-analyzing 50/30/20 transactions...'
                  : `e.g., "${PLACEHOLDER_EXAMPLES[placeholderIndex]}"`
          }
          className="flex-1 bg-transparent px-3 py-2.5 text-xs text-[var(--foreground)] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none disabled:cursor-not-allowed"
        />

        {/* Action Controls inside Input Capsule */}
        <div className="flex items-center gap-1.5 pr-2 shrink-0">
          {/* Clear Button */}
          {inputPrompt && !activeLoading && (
            <button
              type="button"
              onClick={() => setInputPrompt('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={activeLoading || isLimitReached}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10'
            }`}
            title={isListening ? 'Stop voice input' : 'Voice input (Speak override instructions)'}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Submit Action Button */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={activeLoading || isLimitReached || !inputPrompt.trim()}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              inputPrompt.trim() && !activeLoading && !isLimitReached
                ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/25 active:scale-95'
                : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
            title="Submit prompt to AI"
          >
            {activeLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span className="hidden xs:inline">Re-Grouping...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Clickable Suggestion Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
        <span className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase shrink-0">
          Presets:
        </span>
        {QUICK_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setInputPrompt(preset.prompt);
              handleSubmit(preset.prompt);
            }}
            disabled={activeLoading || isLimitReached}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white dark:bg-[var(--background-elevated)] hover:bg-purple-50 dark:hover:bg-purple-500/10 border border-slate-200/80 dark:border-white/[0.08] hover:border-purple-500/30 text-[var(--foreground-muted)] hover:text-purple-600 dark:hover:text-purple-300 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
