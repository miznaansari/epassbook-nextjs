'use client';

import LineIcon from '@/components/ui/LineIcon';
import { Skeleton } from '@/components/ui/States';

// Fixed minimum height (title + two body lines) so cards don't resize when data arrives.
const CARD = 'mm-card flex min-h-[94px] items-start gap-3 p-4';

function InsightCard({ insight, onAction }) {
  if (!insight) {
    return (
      <div className={CARD} aria-busy="true">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-3.5 w-40 max-w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>
    );
  }

  const body = (
    <>
      <span className="mm-in" style={{ background: insight.tone.soft, color: insight.tone.ink }}>
        <LineIcon name={insight.icon} />
      </span>
      <div className="min-w-0">
        <div className="text-[15px] font-extrabold text-(--mm-ink)">{insight.title}</div>
        <div className="mt-0.5 text-[13px] leading-[1.4] text-(--mm-ink-2)">{insight.body}</div>
      </div>
    </>
  );

  if (insight.action && onAction) {
    return (
      <button
        type="button"
        onClick={() => onAction(insight.action)}
        className={`${CARD} mm-focus text-left cursor-pointer transition-colors hover:border-(--mm-brand-line)`}
      >
        {body}
      </button>
    );
  }
  return <div className={CARD}>{body}</div>;
}

export default function InsightCards({ insights, onAction }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-4">
      {insights.map((insight, i) => <InsightCard key={i} insight={insight} onAction={onAction} />)}
    </div>
  );
}
