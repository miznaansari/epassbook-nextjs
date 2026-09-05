'use client';

import { useState, useRef } from 'react';

/**
 * SpotlightCard
 * Linear / Modern signature interactive card component.
 * Features:
 * - 300px radial spotlight that follows the cursor relative to card bounds
 * - Multi-layer shadow with top-edge hairline highlight
 * - Precise hover translateY with expo-out easing
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(94, 106, 210, 0.14)',
  borderColor = 'rgba(255, 255, 255, 0.06)',
  hoverBorderColor = 'rgba(255, 255, 255, 0.12)',
  ...props
}) {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.015] backdrop-blur-xl transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${className}`}
      style={{
        border: `1px solid ${isHovered ? hoverBorderColor : borderColor}`,
        boxShadow: isHovered
          ? '0 0 0 1px rgba(255, 255, 255, 0.08), 0 12px 36px rgba(0, 0, 0, 0.6), 0 0 50px rgba(94, 106, 210, 0.10)'
          : '0 0 0 1px rgba(255, 255, 255, 0.04), 0 4px 20px rgba(0, 0, 0, 0.45)',
      }}
      {...props}
    >
      {/* Top Edge Hairline Specular Highlight */}
      <div 
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-80" 
      />

      {/* Mouse Tracking Radial Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(320px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
        }}
      />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
