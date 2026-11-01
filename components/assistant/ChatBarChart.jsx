'use client';

import { memo, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useChartTheme } from '@/components/reports/chartTheme';
import { parseChartSpec, makeValueFormatter, makeCompactValueFormatter } from './chartSpec';

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function ChartTooltip({ active, payload, label, series, colors, fmt }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="min-w-[150px] rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {series.map((s, i) => (
        <p key={s.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: colors[i] }} aria-hidden="true" />
            {s.name}
          </span>
          <span className="font-semibold tabular-nums text-ink">{fmt(row[s.dataKey])}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Bar chart rendered from a ```chart block in an assistant reply.
 * Memoised on the raw JSON so streaming text after it never re-animates the bars.
 */
function ChatBarChart({ raw, currency = 'INR' }) {
  const spec = useMemo(() => parseChartSpec(raw), [raw]);
  const theme = useChartTheme();
  const [showTable, setShowTable] = useState(false);

  const fmt = useMemo(() => makeValueFormatter(spec?.format, currency), [spec?.format, currency]);
  const compact = useMemo(() => makeCompactValueFormatter(spec?.format, currency), [spec?.format, currency]);

  if (!spec) {
    return (
      <p className="my-3 rounded-xl border border-dashed border-line-strong px-3 py-2 text-xs text-ink-3">
        Couldn&apos;t draw this chart.
      </p>
    );
  }

  const { title, series, data } = spec;
  const multi = series.length > 1;
  const colors = series.map((_, i) => theme.cycles[i]);
  const longestLabel = data.reduce((m, r) => Math.max(m, r.label.length), 0);
  const horizontal = spec.orientation
    ? spec.orientation === 'horizontal'
    : data.length > 6 || longestLabel > 10;

  // Horizontal bars grow with the row count; columns use a fixed plot height.
  const rowHeight = multi ? series.length * 12 + 16 : 30;
  const height = horizontal ? Math.max(160, data.length * rowHeight + 36) : 230;
  const labelWidth = Math.min(116, Math.max(56, Math.min(longestLabel, 14) * 7 + 8));

  const axisProps = { stroke: theme.axis, fontSize: 10, tickLine: false, axisLine: false };
  const summary = `${title || 'Bar chart'}: ${data
    .slice(0, 6)
    .map(r => `${r.label} ${fmt(r[series[0].dataKey])}`)
    .join(', ')}${data.length > 6 ? ', and more' : ''}`;

  return (
    <figure className="my-3 rounded-2xl border border-line bg-card p-3 md:p-4">
      <figcaption className="mb-2 flex items-start justify-between gap-3">
        <span className="min-w-0">
          {title && <span className="block text-[13px] font-semibold leading-snug text-ink">{title}</span>}
          {multi && (
            <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {series.map((s, i) => (
                <span key={s.dataKey} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors[i] }} aria-hidden="true" />
                  {s.name}
                </span>
              ))}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setShowTable(v => !v)}
          aria-pressed={showTable}
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-2 hover:bg-card-2 hover:text-ink cursor-pointer"
        >
          {showTable ? 'Chart' : 'Table'}
        </button>
      </figcaption>

      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-ink-3">
                <th className="py-1.5 pr-3 font-semibold">Item</th>
                {series.map(s => (
                  <th key={s.dataKey} className="py-1.5 pl-3 text-right font-semibold">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map(row => (
                <tr key={row.label}>
                  <td className="py-1.5 pr-3 text-ink">{row.label}</td>
                  {series.map(s => (
                    <td key={s.dataKey} className="py-1.5 pl-3 text-right tabular-nums text-ink">{fmt(row[s.dataKey])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={summary} style={{ height }} className="-ml-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={horizontal ? 'vertical' : 'horizontal'}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              barGap={2}
              barCategoryGap={horizontal ? '22%' : '28%'}
            >
              <CartesianGrid stroke={theme.grid} vertical={horizontal} horizontal={!horizontal} />
              {horizontal ? (
                <>
                  <XAxis type="number" {...axisProps} tickFormatter={compact} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    {...axisProps}
                    width={labelWidth}
                    interval={0}
                    tickFormatter={v => truncate(String(v), 14)}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    dataKey="label"
                    {...axisProps}
                    interval={0}
                    dy={6}
                    tickFormatter={v => truncate(String(v), data.length > 4 ? 7 : 10)}
                  />
                  <YAxis {...axisProps} width={48} tickFormatter={compact} />
                </>
              )}
              <Tooltip
                content={<ChartTooltip series={series} colors={colors} fmt={fmt} />}
                cursor={{ fill: theme.isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.05)' }}
              />
              {series.map((s, i) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name}
                  fill={colors[i]}
                  radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  maxBarSize={horizontal ? 18 : 28}
                  animationDuration={450}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

export default memo(ChatBarChart);
