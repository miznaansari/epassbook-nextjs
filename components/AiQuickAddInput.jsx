'use client';

import { useState, useEffect, useRef } from 'react';
import Icon3D from '@/components/ui/Icon3D';
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
  // Rendered client-side only (after auth), so reading window here is safe.
  const [speechSupported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const recognitionRef = useRef(null);

  // Rotating placeholder effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  // Latest prompt handler for the speech callback (avoids a stale closure).
  const processRef = useRef(null);

  // Web Speech API initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
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
            processRef.current?.(transcript);
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

  useEffect(() => {
    processRef.current = handleProcessPrompt;
  });

  return (
    <div className="w-full">
      <div className="group relative flex items-center gap-2 rounded-2xl border border-line bg-card p-1.5 pl-2 shadow-card transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary-soft" aria-hidden="true">
          <Icon3D name="sparkles" size={22} />
        </span>

        <div className="relative min-w-0 flex-1">
          <label htmlFor="ai-quick-add" className="sr-only">Describe a transaction</label>
          <input
            id="ai-quick-add"
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder={`Try "${PLACEHOLDER_EXAMPLES[placeholderIndex]}"`}
            className="w-full bg-transparent pr-7 text-sm font-medium text-ink placeholder:text-ink-3 focus:outline-none"
          />
          {inputPrompt && (
            <button
              type="button"
              onClick={() => setInputPrompt('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:text-ink cursor-pointer"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {speechSupported && (
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition cursor-pointer ${
              isListening ? 'bg-danger text-white animate-pulse' : 'text-ink-2 hover:bg-card-2 hover:text-ink'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Speak a transaction'}
            title={isListening ? 'Listening… tap to stop' : 'Voice entry'}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => handleProcessPrompt()}
          disabled={isProcessing || !inputPrompt.trim()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-fg transition hover:bg-primary-hover disabled:bg-card-3 disabled:text-ink-3 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Add with AI"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          <span className="hidden sm:inline">{isProcessing ? 'Reading…' : 'Add'}</span>
        </button>
      </div>
    </div>
  );
}
