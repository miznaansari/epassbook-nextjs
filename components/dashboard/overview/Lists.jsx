'use client';

import LineIcon from '@/components/ui/LineIcon';
import { changeTag, itemStyle } from './model';

function CardHead({ title, sub }) {
  return (
    <>
      <h2 className="mm-h2">{title}</h2>
      <div className="mm-lbl mb-3.5 mt-0.5">{sub}</div>
    </>
  );
}

export function TopItems({ cycle, slices, money }) {
  const items = (cycle?.items || []).slice(0, 3);
  return (
    <div className="mm-card p-[22px]">
      <CardHead title="Top items" sub={cycle.isCurrent ? 'Most bought this cycle' : `Most bought in ${cycle.label}`} />
      {items.length === 0 ? (
        <p className="mm-divide py-6 text-center text-[13px] text-(--mm-ink-2)">Nothing logged in {cycle.label} yet.</p>
      ) : (
        <ul>
          {items.map(item => {
            const style = itemStyle(item.category, slices);
            return (
              <li key={item.name} className="mm-divide flex items-center gap-3 py-2.5">
                <span className="mm-in" style={{ background: style.color.soft, color: style.color.ink }}>
                  <LineIcon name={style.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold text-(--mm-ink)">{item.name}</div>
                  <div className="mm-lbl truncate">
                    {style.label}{item.count > 1 ? ` · ${item.count} times` : ''}
                  </div>
                </div>
                <b className="shrink-0 tabular-nums text-(--mm-red-ink)">−{money(item.total)}</b>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CategoryBreakdown({ cycle, previous, slices, money }) {
  return (
    <div className="mm-card p-[22px]">
      <h2 className="mm-h2">Category breakdown</h2>
      <div className="mm-lbl mb-3.5 mt-0.5">
        {previous ? (
          <>
            <span className="md:hidden">{cycle.label} vs {previous.label}</span>
            <span className="hidden md:inline">{cycle.label} with change vs {previous.label}</span>
          </>
        ) : cycle.label}
      </div>
      {slices.length === 0 ? (
        <p className="mm-divide py-6 text-center text-[13px] text-(--mm-ink-2)">Nothing logged in {cycle.label} yet.</p>
      ) : (
        <ul>
          {slices.map(s => {
            const tag = changeTag(s);
            return (
              <li key={s.id} className="mm-divide flex items-center gap-3 py-3">
                <span className="mm-in" style={{ background: s.color.soft, color: s.color.mark }}>
                  <LineIcon name={s.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-3 text-[14px] font-bold text-(--mm-ink)">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className="truncate">{s.name}</span>
                      {tag && (
                        <span className="mm-tag" style={{ background: tag.tone.soft, color: tag.tone.ink }}>{tag.text}</span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">{money(s.total)}</span>
                  </div>
                  <div
                    className="mt-2 h-2 rounded-full bg-(--mm-line-2) md:h-2.5"
                    role="progressbar"
                    aria-label={`${s.name} share of ${cycle.label}`}
                    aria-valuenow={Math.round(s.share)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${s.share}%`, background: s.color.mark }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
