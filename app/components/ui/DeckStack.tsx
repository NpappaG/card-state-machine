'use client';

import { motion } from 'framer-motion';

interface DeckStackProps {
  cardCount: number;
  maxCards?: number;
}

/**
 * Animated deck component that shows 3D stack thickness based on card count.
 * Stack gets thinner as cards are drawn.
 */
export function DeckStack({ cardCount, maxCards = 52 }: DeckStackProps) {
  if (cardCount === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-white/50 bg-green-800/50">
        <span className="text-white text-sm">Empty</span>
      </div>
    );
  }

  // Calculate how many "layers" to show (max 8 for visual effect)
  const visibleLayers = Math.min(Math.ceil((cardCount / maxCards) * 8), 8);

  return (
    <div className="relative h-full w-full">
      {/* Draw the stack layers from bottom to top */}
      {Array.from({ length: visibleLayers }).map((_, idx) => {
        const offset = idx * 2; // 2px offset per layer
        const isTop = idx === visibleLayers - 1;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: idx * 0.02 }}
            className="absolute rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-900 shadow-lg"
            style={{
              bottom: `${offset}px`,
              left: `-${offset}px`,
              right: `${offset}px`,
              height: '140px',
              zIndex: idx,
            }}
          >
            {/* White edge highlight for 3D effect */}
            <div className="absolute top-0 right-0 h-full w-[1px] bg-white/90" />
            <div className="absolute top-0 right-0 w-full h-[1px] bg-white/60" />

            {/* Inner decorative rings */}
            <div className="absolute inset-2 rounded-lg border-2 border-blue-400/30" />
            <div className="absolute inset-4 rounded border border-blue-400/20" />

            {/* Card count on top layer only */}
            {isTop && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="text-3xl font-bold text-white drop-shadow-lg z-10">
                  {cardCount}
                </span>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
