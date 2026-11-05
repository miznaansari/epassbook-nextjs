'use client';

import { useState, useEffect, useRef } from 'react';
import LineIcon from '@/components/ui/LineIcon';
import { parseTransactionPrompt } from '@/lib/quickParser';

const PLACEHOLDER_EXAMPLES = [
  '250 pizza swiggy',
  '10rs cocacola',
  'Lent 1000 to Rahul',
  'Spent 150 on fuel',
  '₹500 groceries at supermarket',
  'SIP 2500 in mutual fund',
  'Borrowed 2000 from Amit',
  'Chai and samosa 40'
];

/** One-line AI entry ("250 pizza swiggy"): parses the text, then opens the entry form prefilled. */
export default function AiQuickAddInput({ onPrefill }) {
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
    <div className="mm-card flex w-full items-center gap-2.5 py-1 pl-3.5 pr-1 transition-colors focus-within:border-(--mm-brand-line) md:gap-3 md:py-1.5 md:pl-4 md:pr-1.5">
      <span className="text-(--mm-sparkle)" aria-hidden="true">
        <LineIcon name="sparkle" />
      </span>

      <div className="relative min-w-0 flex-1">
        <label htmlFor="ai-quick-add" className="sr-only">Quick entry: describe a transaction</label>
        <input
          id="ai-quick-add"
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          enterKeyHint="send"
          placeholder={`Try: ${PLACEHOLDER_EXAMPLES[placeholderIndex]}`}
          className="min-h-10 w-full border-0 bg-transparent pr-7 text-[14px] font-medium text-(--mm-ink) outline-none placeholder:text-(--mm-ink-3)"
        />
        {inputPrompt && !isProcessing && (
          <button
            type="button"
            onClick={() => setInputPrompt('')}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md p-1 text-(--mm-ink-3) hover:text-(--mm-ink) cursor-pointer"
            aria-label="Clear"
          >
            <LineIcon name="close" size={14} />
          </button>
        )}
      </div>

      {speechSupported && (
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`mm-btn px-3 ${isListening ? 'animate-pulse bg-(--mm-red-soft) text-(--mm-red-ink)' : 'mm-btn-soft'}`}
          aria-label={isListening ? 'Stop listening' : 'Voice entry'}
          aria-pressed={isListening}
          title={isListening ? 'Listening… tap to stop' : 'Voice entry'}
        >
          <LineIcon name="mic" />
        </button>
      )}

      {(inputPrompt.trim() || isProcessing) && (
        <button
          type="button"
          onClick={() => handleProcessPrompt()}
          disabled={isProcessing}
          className="mm-btn bg-(--mm-brand) px-3 text-(--mm-card)"
          aria-label="Add with AI"
        >
          <LineIcon name={isProcessing ? 'spinner' : 'arrow'} className={isProcessing ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
}
