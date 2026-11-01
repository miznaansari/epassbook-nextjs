'use client';

import { useState } from 'react';
import { uiIconEmoji, uiIconSrc } from '@/lib/uiIcons';

/**
 * 3D icon from public/icons3d (Fluent Emoji 3D). Falls back to the emoji
 * glyph if the file is missing. Decorative by default (aria-hidden).
 */
export default function Icon3D({ name, size = 28, className = '', label }) {
  const [broken, setBroken] = useState(false);
  const src = uiIconSrc(name);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  if (!src || broken) {
    return (
      <span
        {...a11y}
        className={`inline-flex items-center justify-center leading-none select-none ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.82 }}
      >
        {uiIconEmoji(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...a11y}
      src={src}
      alt={label || ''}
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      onError={() => setBroken(true)}
      className={`inline-block shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** 3D icon sitting in a soft tinted tile. */
export function IconTile({ name, size = 44, tone = 'primary', className = '' }) {
  const tones = {
    primary: 'bg-primary-soft',
    secondary: 'bg-secondary-soft',
    success: 'bg-success-soft',
    danger: 'bg-danger-soft',
    neutral: 'bg-card-2',
    glass: 'bg-white/15 backdrop-blur-sm',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl ${tones[tone] || tones.primary} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon3D name={name} size={Math.round(size * 0.62)} />
    </span>
  );
}
