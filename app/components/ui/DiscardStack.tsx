'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import type { Card as CardType } from '@/lib/types';

interface DiscardStackProps {
  discardPile: CardType[];
  maxVisible?: number;
}

/**
 * Animated discard pile that shows stacked cards with the top card prominently displayed.
 * Shows last few cards stacked behind for visual depth.
 */
export function DiscardStack({ discardPile, maxVisible = 52 }: DiscardStackProps) {
  if (discardPile.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-white/50 bg-green-800/50">
        <span className="text-white text-sm">Empty</span>
      </div>
    );
  }

  // Get the last N cards to show as stack (show all by default)
  const visibleCards = maxVisible === Infinity ? discardPile : discardPile.slice(-maxVisible);

  return (
    <div className="relative h-full w-full">
      <AnimatePresence mode="popLayout">
        {visibleCards.map((card, idx) => {
          const isTop = idx === visibleCards.length - 1;
          const xOffset = idx * 30; // 30px horizontal offset to show rank/suit
          const rotation = idx * 1.5 - (visibleCards.length - 1) * 0.75; // Slight rotation spread
          const depthFromTop = visibleCards.length - 1 - idx; // 0 for top, 1 for next, 2 for bottom
          const opacity = isTop ? 1 : 1 - (depthFromTop * 0.03); // 3% reduction per card below

          return (
            <motion.div
              key={card.id}
              layout
              initial={{
                scale: 0.8,
                opacity: 0,
                x: -100,
                rotate: -20,
              }}
              animate={{
                scale: isTop ? 1 : 0.95,
                opacity: opacity,
                x: xOffset,
                y: 0,
                rotate: isTop ? 0 : rotation,
              }}
              exit={{
                scale: 0.8,
                opacity: 0,
                transition: { duration: 0.2 },
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
              className="absolute top-0 left-0"
              style={{
                zIndex: idx,
                filter: isTop ? 'none' : 'brightness(0.85)',
              }}
            >
              {/* White edge highlight for 3D effect */}
              {!isTop && (
                <>
                  <div className="absolute top-0 right-0 h-full w-[1px] bg-white/90 z-10" />
                  <div className="absolute top-0 right-0 w-full h-[1px] bg-white/60 z-10" />
                </>
              )}
              <Card card={card} disabled layoutId={card.id} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
