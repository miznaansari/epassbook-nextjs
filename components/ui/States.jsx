'use client';

import { RefreshCw } from 'lucide-react';
import Icon3D from './Icon3D';
import Button from './Button';

/** Friendly error with a Retry button. */
export function ErrorState({ title = 'Something went wrong', message, onRetry, retrying = false, compact = false, className = '' }) {
  return (
    <div role="alert" className={`flex ${compact ? 'items-center gap-3 text-left' : 'flex-col items-center text-center py-8'} ${className}`}>
      <Icon3D name="warning" size={compact ? 32 : 56} />
      <div className={compact ? 'flex-1 min-w-0' : 'mt-3'}>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {message && <p className="mt-0.5 text-xs text-ink-2 break-words">{message}</p>}
      </div>
      {onRetry && (
        <Button variant={compact ? 'outline' : 'primary'} size="sm" onClick={onRetry} loading={retrying} className={compact ? '' : 'mt-4'}>
          {!retrying && <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          Retry
        </Button>
      )}
    </div>
  );
}

/** Empty state with a 3D icon and an optional action. */
export function EmptyState({ icon = 'search', title, message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center py-8 ${className}`}>
      <Icon3D name={icon} size={56} />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 max-w-xs text-xs text-ink-2">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '', ...rest }) {
  return <span className={`block rounded-md bg-card-3 animate-pulse ${className}`} aria-hidden="true" {...rest} />;
}

const BADGE_TONES = {
  primary: 'bg-primary-soft text-primary-ink',
  secondary: 'bg-secondary-soft text-secondary-ink',
  success: 'bg-success-soft text-success-ink',
  danger: 'bg-danger-soft text-danger-ink',
  neutral: 'bg-card-3 text-ink-2',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_TONES[tone] || BADGE_TONES.neutral} ${className}`}>
      {children}
    </span>
  );
}
