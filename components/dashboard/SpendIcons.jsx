'use client';

import { useState } from 'react';
import { Store } from 'lucide-react';

/**
 * Merchant avatar: downloaded brand logo (R2) → group icon → initial letter on
 * the merchant's colour. Local shops get a small store badge.
 */
export function BrandAvatar({ merchant, size = 40, className = '' }) {
  const [broken, setBroken] = useState(false);
  const { name = '?', logoUrl, emoji, color = '#64748B', kind } = merchant || {};
  const radius = Math.round(size * 0.28);
  const showImg = logoUrl && !broken;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: showImg ? (kind === 'group' ? 'var(--surface)' : '#fff') : color,
        boxShadow: 'inset 0 0 0 1px var(--border-default)',
      }}
      aria-hidden="true"
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className={kind === 'group' ? 'w-[72%] h-[72%] object-contain' : 'w-full h-full object-cover'}
        />
      ) : emoji ? (
        <span style={{ fontSize: size * 0.5 }}>{emoji}</span>
      ) : (
        <span className="font-bold text-white" style={{ fontSize: size * 0.42 }}>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      {kind === 'local' && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-card text-ink-2"
          style={{ width: size * 0.42, height: size * 0.42, boxShadow: '0 0 0 1.5px var(--background-elevated)' }}
        >
          <Store style={{ width: size * 0.26, height: size * 0.26 }} />
        </span>
      )}
    </span>
  );
}

/** Item icon: Fluent 3D image from R2, falling back to the emoji glyph. */
export function ItemIcon({ imageUrl, emoji = '🏷️', size = 36, className = '' }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {imageUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="w-[78%] h-[78%] object-contain"
        />
      ) : (
        <span style={{ fontSize: size * 0.55 }}>{emoji}</span>
      )}
    </span>
  );
}
