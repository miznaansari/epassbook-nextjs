'use client';

import { forwardRef } from 'react';
import Link from 'next/link';

const VARIANTS = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-glow-primary',
  secondary: 'bg-secondary text-secondary-fg hover:bg-secondary-hover shadow-glow-secondary',
  soft: 'bg-primary-soft text-primary-ink hover:brightness-95 dark:hover:brightness-125',
  outline: 'bg-card text-ink border border-line hover:border-line-strong hover:bg-card-2',
  ghost: 'text-ink-2 hover:text-ink hover:bg-card-2',
  danger: 'bg-danger text-white hover:brightness-110',
  onBrand: 'bg-white text-[#3730A3] hover:bg-white/90 shadow-pop',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-2xl',
  icon: 'h-10 w-10 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
};

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [
    'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none cursor-pointer',
    'transition-[background-color,color,box-shadow,transform,filter] duration-200 active:scale-[0.98]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className,
  ].join(' ');
}

const Spinner = () => (
  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
);

/**
 * Button with design-system variants. Pass `href` to render a Next.js Link.
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, href, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const cls = buttonClasses({ variant, size, className });
  if (href) {
    return (
      <Link ref={ref} href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});

export default Button;
