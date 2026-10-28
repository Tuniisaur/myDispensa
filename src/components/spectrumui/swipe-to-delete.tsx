/**
 * Spectrum UI — SwipeToDelete
 *
 * Minimalist iOS-style swipe to delete.
 * - At rest: The container has a subtle, delicate border (zinc-200/80) with a clean white card. Zero red bleed.
 * - During swipe: The red background is strictly isolated inside the action zone, while the outer border progressively and subtly tints from neutral to soft rose/red.
 */

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ReactNode } from 'react';

export interface SwipeToDeleteProps {
  onDelete: () => void;
  children: ReactNode;
  label?: string;
  actionWidth?: number;
  threshold?: number;
  revealOnHover?: boolean;
  hoverPeek?: number;
  disabled?: boolean;
  className?: string;
}

const FLING_VELOCITY = -900;
const COLLAPSE_DURATION = 0.28;
const COLLAPSE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const ANNOUNCE_HOLD_MS = 250;
const DRAG_ELASTIC = { left: 0.1, right: 0 } as const;

const SNAP_OPEN_SPRING = { type: 'spring', stiffness: 550, damping: 42 } as const;
const SNAP_BACK_SPRING = { type: 'spring', stiffness: 500, damping: 38 } as const;
const PEEK_SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const;
const ICON_POP_SPRING = { type: 'spring', stiffness: 520, damping: 18 } as const;
const ICON_REST_SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

const HOVER_QUERY = '(hover: hover) and (pointer: fine)';
const subscribeHover = (onChange: () => void) => {
  const mq = window.matchMedia(HOVER_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const getHover = () => (typeof window !== 'undefined' ? window.matchMedia(HOVER_QUERY).matches : false);
const getHoverOnServer = () => false;

function useCanHover() {
  return useSyncExternalStore(subscribeHover, getHover, getHoverOnServer);
}

export function SwipeToDelete({
  onDelete,
  children,
  label = 'item',
  actionWidth = 84,
  threshold = 0.85,
  revealOnHover = false,
  hoverPeek = 50,
  disabled = false,
  className,
}: SwipeToDeleteProps) {
  const shouldReduceMotion = useReducedMotion();
  const canHover = useCanHover();

  const outerRef = useRef<HTMLDivElement>(null);
  const rowControls = useAnimationControls();
  const outerControls = useAnimationControls();

  const x = useMotionValue(0);
  const exposed = useTransform(x, (v) => Math.min(actionWidth, Math.max(0, -v)));

  // Bordo sottile da 1px:
  // A riposo: colore neutro grigio chiarissimo (#e4e4e7 / zinc-200) identico al resto dell'app
  // Durante lo swipe: si colora progressivamente di rosso (#e11d48)
  const borderColor = useTransform(
    x,
    [0, -10, -actionWidth],
    [
      '#e4e4e7', // neutral zinc-200 (a riposo)
      '#f43f5e', // rose-500 delicato
      '#e11d48', // rose-600 deciso a piena apertura
    ]
  );

  const [pastThreshold, setPastThreshold] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const draggingRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const committedRef = useRef(false);

  useMotionValueEvent(x, 'change', (latest) => {
    const isPast = latest <= -actionWidth * threshold;
    setPastThreshold(isPast);
    setPeeked(latest < -4);
  });

  const animateRow = useCallback(
    (to: number, spring: typeof SNAP_BACK_SPRING | typeof PEEK_SPRING) => {
      if (shouldReduceMotion) {
        x.set(to);
        return;
      }
      void rowControls.start({
        x: to,
        transition: spring,
      });
    },
    [shouldReduceMotion, rowControls, x],
  );

  const settle = useCallback(() => {
    if (committedRef.current || draggingRef.current) return;
    const shouldPeek =
      revealOnHover && canHover && !disabled && (hoveredRef.current || focusedRef.current);
    animateRow(shouldPeek ? -hoverPeek : 0, shouldPeek ? PEEK_SPRING : SNAP_BACK_SPRING);
  }, [revealOnHover, canHover, disabled, animateRow, hoverPeek]);

  useEffect(() => {
    settle();
  }, [settle]);

  const commit = useCallback(async () => {
    if (disabled || committedRef.current) return;
    committedRef.current = true;
    setIsDeleting(true);

    if (shouldReduceMotion) {
      onDelete();
      return;
    }

    await rowControls.start({
      x: -actionWidth,
      transition: SNAP_OPEN_SPRING,
    });

    await outerControls.start({
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      transition: {
        duration: COLLAPSE_DURATION,
        ease: COLLAPSE_EASE,
      },
    });

    await new Promise((resolve) => {
      setTimeout(resolve, ANNOUNCE_HOLD_MS);
    });
    onDelete();
  }, [disabled, shouldReduceMotion, actionWidth, rowControls, outerControls, onDelete]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      draggingRef.current = false;
      if (committedRef.current) return;
      const commitPoint = -actionWidth * threshold;
      if (x.get() <= commitPoint || info.velocity.x < FLING_VELOCITY) {
        void commit();
      } else {
        settle();
      }
    },
    [actionWidth, threshold, x, commit, settle],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.target !== event.currentTarget) return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        void commit();
      }
    },
    [disabled, commit],
  );

  return (
    <motion.div
      ref={outerRef}
      role="group"
      aria-label={label}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      onPointerEnter={() => {
        hoveredRef.current = true;
        settle();
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
        settle();
      }}
      onFocus={() => {
        focusedRef.current = true;
        settle();
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        focusedRef.current = false;
        settle();
      }}
      initial={false}
      animate={outerControls}
      className={cn(
        'group/swipe relative w-full rounded-2xl select-none',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-700',
        className,
      )}
    >
      {/* Contenitore a sfondo BIANCO con bordo sottile (1px) che si colora SOLO durante lo swipe */}
      <motion.div
        style={{ borderColor }}
        className="relative overflow-hidden rounded-2xl border bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)]"
      >
        {/* Delete action: contenuta all'interno a filo destro, si svela solo quando la card scivola a sinistra */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Elimina ${label}`}
          disabled={disabled || isDeleting}
          onClick={() => void commit()}
          className="absolute inset-y-0 right-0 bg-rose-500 text-white flex items-center justify-center cursor-pointer outline-none hover:bg-rose-600 active:bg-rose-700 transition-colors"
          style={{ width: actionWidth }}
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 flex items-center justify-center text-white"
            style={{ width: exposed }}
          >
            <motion.span
              className="flex items-center justify-center"
              initial={false}
              animate={{
                scale: shouldReduceMotion || pastThreshold ? 1.2 : peeked ? 0.95 : 0.75,
              }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : pastThreshold
                    ? ICON_POP_SPRING
                    : ICON_REST_SPRING
              }
            >
              <Trash2 size={20} strokeWidth={2.2} />
            </motion.span>
          </motion.span>
        </button>

        {/* Superficie bianca dell'alimento (trascinabile con blocco diagonale) */}
        <motion.div
          drag={disabled || isDeleting ? false : 'x'}
          dragDirectionLock
          dragConstraints={{ left: -actionWidth, right: 0 }}
          dragElastic={DRAG_ELASTIC}
          dragMomentum={false}
          onDragStart={() => {
            draggingRef.current = true;
          }}
          onDragEnd={handleDragEnd}
          initial={false}
          animate={rowControls}
          style={{ x }}
          className={cn(
            'relative w-full touch-pan-y bg-white',
            !disabled && !isDeleting && 'cursor-grab active:cursor-grabbing',
          )}
        >
          {children}
        </motion.div>
      </motion.div>

      <span role="status" aria-live="polite" className="sr-only">
        {isDeleting ? `${label} eliminato` : ''}
      </span>
    </motion.div>
  );
}
