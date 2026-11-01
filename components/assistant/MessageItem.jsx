'use client';

import { Check, Copy, Loader2, Pencil, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import Icon3D from '@/components/ui/Icon3D';
import { formatMessageContent } from './markdown';

const RECEIPT_IMG_RE = /!\[(?:Receipt Attachment \d+|Receipt Attachment|Attached Receipt|Receipt)\]\((https?:\/\/[^\s)]+)\)/g;

function imagesOf(msg) {
  if (Array.isArray(msg.imagePreviews) && msg.imagePreviews.length) return msg.imagePreviews;
  if (msg.imagePreview) return [msg.imagePreview];
  if (msg.content) return [...msg.content.matchAll(RECEIPT_IMG_RE)].map(m => m[1]);
  return [];
}

function ActionButton({ onClick, label, children, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors cursor-pointer ${
        active ? 'bg-primary-soft text-primary-ink' : 'text-ink-3 hover:bg-card-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * One chat message.
 * - user: right-aligned bubble; failed sends show an inline error with Retry / Edit.
 * - assistant: avatar + rich text; actions (listen, copy); interrupted streams offer Reload.
 */
export default function MessageItem({
  msg,
  isStreaming,
  currency,
  onRetry,
  onEdit,
  onReload,
  onSpeak,
  speaking,
  audioLoading,
  onCopy,
  copied,
  onImageClick,
  onProposalCreated,
}) {
  const isAi = msg.role === 'assistant';
  const text = msg.content ? msg.content.replace(RECEIPT_IMG_RE, '').trim() : '';

  if (!isAi) {
    const images = imagesOf(msg);
    const failed = msg.status === 'failed';
    const sending = msg.status === 'sending';
    return (
      <div className="flex flex-col items-end">
        <div className={`max-w-[88%] md:max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed ${
          failed ? 'bg-danger-soft text-ink ring-1 ring-danger/30' : 'bg-primary-soft text-ink'
        } ${sending ? 'opacity-70' : ''}`}>
          {images.length > 0 && (
            <div className={`mb-2 grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => onImageClick(src)}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl bg-card-3 cursor-zoom-in"
                  aria-label={`Open attachment ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
        </div>

        {sending && (
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-3">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Sending…
          </span>
        )}

        {failed && (
          <div role="alert" className="mt-1.5 flex max-w-[88%] md:max-w-[75%] flex-wrap items-center justify-end gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-danger-ink">
              <Icon3D name="warning" size={16} />
              {msg.error || "Couldn't get a reply."}
            </span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 text-xs font-semibold text-ink hover:border-line-strong cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-2 hover:bg-card-2 hover:text-ink cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </button>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft ${isStreaming ? 'ring-2 ring-primary/40' : ''}`}>
        <Icon3D name="assistant" size={24} />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="break-words text-sm leading-relaxed text-ink">
          {formatMessageContent(text, true, currency, onProposalCreated, { streaming: isStreaming })}
          {isStreaming && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 rounded-sm bg-primary animate-pulse" aria-hidden="true" />}
        </div>

        {msg.interrupted && (
          <div role="alert" className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs text-ink">
            <Icon3D name="warning" size={16} />
            The reply was cut off.
            <button type="button" onClick={onReload} className="inline-flex items-center gap-1 font-semibold text-primary-ink hover:underline cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reload
            </button>
          </div>
        )}

        {msg.content && !isStreaming && (
          <div className="mt-1.5 -ml-2 flex items-center gap-0.5">
            <ActionButton onClick={onSpeak} label={speaking ? 'Stop reading' : 'Read aloud'} active={speaking}>
              {audioLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{speaking ? 'Stop' : 'Listen'}</span>
            </ActionButton>
            <ActionButton onClick={onCopy} label={copied ? 'Copied' : 'Copy reply'}>
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </ActionButton>
          </div>
        )}
      </div>
    </div>
  );
}
