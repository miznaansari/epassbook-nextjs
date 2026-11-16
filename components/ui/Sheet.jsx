'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { motion, AnimatePresence, useDragControls, useReducedMotion } from 'framer-motion';

/**
 * Shared overlay shell.
 *
 * Phones: a bottom sheet that follows the finger when dragged by its grab handle
 * (or any element using `useSheetDragHandle()`, e.g. a header) and closes when
 * pulled down far or fast enough. md+: a centered dialog (`variant="center"`) or a
 * right-hand drawer (`variant="drawer"`), no dragging.
 *
 * Also handles: backdrop click, Escape, body scroll lock, dialog semantics,
 * initial focus, safe-area padding and reduced motion.
 */

const CLOSE_DISTANCE = 110; // px pulled down
const CLOSE_VELOCITY = 600; // px/s flick

/** Should a drag that ended at `offsetY` px with `velocityY` px/s dismiss the sheet? */
export function shouldDismiss(offsetY, velocityY) {
  return offsetY > CLOSE_DISTANCE || (velocityY > CLOSE_VELOCITY && offsetY > 20);
}

const DragContext = createContext(null);

/** Props that turn an element inside a <Sheet> into a drag handle (no-op on desktop). */
export function useSheetDragHandle() {
  return useContext(DragContext) || {};
}

/** A region inside a <Sheet> (typically its header) that can be grabbed to drag the sheet. */
export function SheetDragArea({ as: Tag = 'div', style, ...rest }) {
  const handle = useSheetDragHandle();
  return <Tag {...rest} onPointerDown={handle.onPointerDown} style={{ ...style, ...handle.style }} />;
}

const QUERY = '(min-width: 768px)';
const subscribe = (onChange) => {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const useIsDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

const EASE = [0.16, 1, 0.3, 1];

export default function Sheet({
  open,
  onClose,
  label,
  variant = 'center', // desktop presentation: 'center' | 'drawer'
  size = 'md', // centered dialog width on desktop: 'md' | 'wide'
  zIndex = 110,
  dismissible = true, // false while a submit is in flight
  scroll = true, // false: children manage their own scrolling (flex column)
  className = '', // panel surface: background, border, text colour
  bodyClassName = '', // padding etc. around children
  children,
}) {
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    closeRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissibleRef.current) closeRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const canDrag = !isDesktop && dismissible;
  const handleProps = useMemo(() => (canDrag ? {
    onPointerDown: (e) => dragControls.start(e),
    style: { touchAction: 'none' },
  } : {}), [canDrag, dragControls]);

  const requestClose = () => {
    if (dismissible) onClose?.();
  };

  const drawer = variant === 'drawer';
  const motionProps = !isDesktop
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : drawer
      ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
      : { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 12 } };

  const layout = drawer
    ? 'md:items-stretch md:justify-end'
    : 'md:items-center md:justify-center md:p-6';
  const shape = drawer
    ? 'md:h-full md:max-h-none md:w-[460px] md:rounded-none'
    : `md:max-h-[85vh] md:rounded-2xl ${size === 'wide' ? 'md:max-w-2xl' : 'md:max-w-md'}`;

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 flex items-end justify-center ${layout}`} style={{ zIndex }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={requestClose}
            aria-hidden="true"
            className={`absolute inset-0 bg-black/55 ${dismissible ? 'cursor-pointer' : ''}`}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            {...motionProps}
            transition={{ duration: reduceMotion ? 0 : 0.3, ease: EASE }}
            drag={canDrag ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.85 }}
            onDragEnd={(_, info) => {
              if (shouldDismiss(info.offset.y, info.velocity.y)) requestClose();
            }}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl outline-none ${shape} ${className}`}
          >
            <DragContext.Provider value={handleProps}>
              {/* Grab handle: generous touch area, phones only */}
              <div
                {...handleProps}
                className="flex h-7 w-full shrink-0 cursor-grab items-center justify-center active:cursor-grabbing md:hidden"
                aria-hidden="true"
              >
                <span className="h-1 w-10 rounded-full bg-current opacity-25" />
              </div>
              <div
                className={`min-h-0 flex-1 ${scroll ? 'overflow-y-auto overscroll-contain' : 'flex flex-col'} ${bodyClassName}`}
                style={scroll ? { paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' } : undefined}
              >
                {children}
              </div>
            </DragContext.Provider>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
