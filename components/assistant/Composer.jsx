'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle, ArrowUp, Loader2, Mic, MicOff, Plus, X } from 'lucide-react';
import Icon3D from '@/components/ui/Icon3D';

const MAX_IMAGES = 10;

/** Message composer: receipt attachments, auto-growing input, voice and send. */
export default function Composer({
  input,
  setInput,
  onSubmit,
  onPaste,
  attachedImages,
  onRemoveImage,
  onRetryUpload,
  onClearImages,
  onOpenImage,
  fileInputRef,
  onImageSelect,
  isProcessingImage,
  isListening,
  isTranscribing,
  onToggleMic,
  isGenerating,
  disabled,
}) {
  const textareaRef = useRef(null);

  // Auto-grow up to ~6 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const canSend = !disabled && !isTranscribing && (input.trim() || attachedImages.length > 0);

  const placeholder = isListening
    ? 'Listening… tap the mic to finish'
    : isTranscribing
      ? 'Turning your voice into text…'
      : isGenerating
        ? 'Thinking…'
        : attachedImages.length
          ? `Add a note for ${attachedImages.length} receipt${attachedImages.length === 1 ? '' : 's'}…`
          : 'Ask anything or add a receipt';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSubmit(e);
    }
  };

  return (
    <div className="space-y-2">
      {attachedImages.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-2.5 shadow-card">
          <div className="mb-2 flex items-center justify-between px-0.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <Icon3D name="receipt" size={16} /> Receipts ({attachedImages.length}/{MAX_IMAGES})
            </span>
            <button type="button" onClick={onClearImages} className="font-semibold text-danger-ink hover:underline cursor-pointer">
              Clear all
            </button>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {attachedImages.map((img, idx) => (
              <li key={img.id} className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${img.status === 'error' ? 'border-danger' : 'border-line'}`}>
                <button type="button" onClick={() => onOpenImage(img.previewUrl || img.url)} className="h-full w-full cursor-zoom-in" aria-label={`Preview ${img.name}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl || img.url} alt="" className="h-full w-full object-cover" />
                </button>
                {img.status === 'uploading' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/50" aria-label="Uploading">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </span>
                )}
                {img.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => onRetryUpload(img.id)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-danger-soft text-[10px] font-bold text-danger-ink cursor-pointer"
                    title={img.errorMessage || 'Upload failed'}
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute right-0.5 top-0.5 rounded-full bg-ink/70 p-0.5 text-white hover:bg-danger cursor-pointer"
                  aria-label={`Remove ${img.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-0.5 left-0.5 rounded bg-ink/70 px-1 text-[9px] font-bold text-white">{idx + 1}</span>
              </li>
            ))}
            {attachedImages.length < MAX_IMAGES && (
              <li>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-line-strong text-[10px] font-semibold text-ink-2 hover:border-primary hover:text-primary-ink cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className={`flex items-end gap-1.5 rounded-[22px] border bg-card p-1.5 shadow-pop transition ${
          isListening ? 'border-danger ring-4 ring-danger/15' : 'border-line focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15'
        }`}
      >
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={onImageSelect} />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessingImage}
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft transition hover:brightness-95 dark:hover:brightness-125 disabled:opacity-50 cursor-pointer"
          aria-label="Attach receipt photos"
          title="Attach receipt photos (up to 10)"
        >
          {isProcessingImage ? <Loader2 className="h-4 w-4 animate-spin text-secondary-ink" /> : <Icon3D name="camera" size={22} />}
          {attachedImages.length > 0 && !isProcessingImage && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-fg">
              {attachedImages.length}
            </span>
          )}
        </button>

        <label htmlFor="chat-input" className="sr-only">Message</label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          disabled={disabled || isTranscribing}
          className="min-h-10 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-sm leading-5 text-ink placeholder:text-ink-3 focus:outline-none disabled:opacity-70"
        />

        <button
          type="button"
          onClick={onToggleMic}
          disabled={disabled || isTranscribing}
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition cursor-pointer disabled:opacity-50 ${
            isListening ? 'bg-danger text-white animate-pulse' : 'text-ink-2 hover:bg-card-2 hover:text-ink'
          }`}
          aria-label={isListening ? 'Stop recording' : 'Speak your message'}
          title={isListening ? 'Stop and transcribe' : 'Voice input'}
        >
          {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-glow-primary transition hover:bg-primary-hover active:scale-95 disabled:bg-card-3 disabled:text-ink-3 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>
      <p className="hidden md:block text-center text-[11px] text-ink-3">AI can make mistakes. Double-check amounts before you approve entries.</p>
    </div>
  );
}
