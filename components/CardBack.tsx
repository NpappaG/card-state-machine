'use client';

import { motion } from 'framer-motion';

interface CardBackProps {
  className?: string;
}

/**
 * Card back design - used for face-down cards in the deck.
 */
export function CardBack({ className = '' }: CardBackProps) {
  return (
    <motion.div
      className={`
        relative flex flex-col items-center justify-center
        rounded-xl bg-gradient-to-br from-blue-600 to-blue-800
        border-2 border-blue-900 shadow-lg overflow-hidden
        ${className}
      `}
      style={{ width: '100px', height: '140px', padding: '6px' }}
    >
      {/* Decorative pattern */}
      <div className="absolute inset-2 rounded-lg border-2 border-blue-400/30" />
      <div className="absolute inset-4 rounded border border-blue-400/20" />

      {/* Center design */}
      <div className="relative z-10 text-6xl text-white/20 font-bold">
        ♠
      </div>
    </motion.div>
  );
}
