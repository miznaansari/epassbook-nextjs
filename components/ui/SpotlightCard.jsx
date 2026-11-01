'use client';

import { useState, useRef } from 'react';

/**
 * SpotlightCard — token-driven card with a cursor-following spotlight.
 * Works in light and dark mode through the design tokens (no theme checks).
 * Optional `spotlightColor`, `borderColor`, `hoverBorderColor` overrides are kept
 * for existing callers.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor,
  borderColor,
  hoverBorderColor,
  ...props
}) {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const spotlight = spotlightColor || 'color-mix(in srgb, var(--color-primary) 12%, transparent)';
  const border = isHovered
    ? (hoverBorderColor || 'var(--color-line-strong)')
    : (borderColor || 'var(--color-line)');

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl bg-card transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
        isHovered ? 'shadow-pop' : 'shadow-card'
      } ${className}`}
      style={{ border: `1px solid ${border}` }}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(320px circle at ${position.x}px ${position.y}px, ${spotlight}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
