'use client';

import { motion } from 'framer-motion';
import type { Card as CardType } from '@/lib/types';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isDisabled?: boolean;
  animationState?: 'idle' | 'selected' | 'exiting' | 'inHand';
  onClick?: () => void;
}

// Suit symbols
const SUIT_SYMBOLS: Record<CardType['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// Suit colors
const SUIT_COLORS: Record<CardType['suit'], string> = {
  hearts: '#DC2626', // red-600
  diamonds: '#DC2626',
  clubs: '#1F2937', // gray-800
  spades: '#1F2937',
};

/**
 * Card component - displays a playing card with animations.
 *
 * Visual states:
 * - idle: Normal state
 * - selected: Card is selected for play (elevated, highlighted)
 * - exiting: Card is being played (flying to discard pile)
 * - inHand: Card is in player's hand
 *
 * Animation timing matches GAME_TIMING constants to coordinate with state machine.
 */
export function Card({
  card,
  isSelected = false,
  isDisabled = false,
  animationState = 'idle',
  onClick,
}: CardProps) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  // Animation variants
  const variants = {
    idle: {
      scale: 1,
      y: 0,
      rotate: 0,
      opacity: 1,
    },
    selected: {
      scale: 1.05,
      y: -10,
      rotate: 0,
      opacity: 1,
    },
    exiting: {
      scale: 0.8,
      x: 100,
      y: -50,
      rotate: 15,
      opacity: 0,
      transition: { duration: 0.4 }, // Matches EVALUATING_DELAY
    },
    inHand: {
      scale: 1,
      y: 0,
      rotate: 0,
      opacity: 1,
    },
  };

  return (
    <motion.button
      className={`
        relative flex flex-col items-center
        rounded-xl bg-white shadow-lg
        border-2 transition-all overflow-hidden
        ${isSelected ? 'border-blue-500 ring-4 ring-blue-300' : 'border-gray-300'}
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-xl'}
        ${animationState === 'exiting' ? 'pointer-events-none' : ''}
      `}
      variants={variants}
      initial="idle"
      animate={isSelected ? 'selected' : animationState}
      whileHover={!isDisabled && !isSelected ? { scale: 1.02 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      layout
      style={{ width: '100px', height: '140px', padding: '6px' }}
    >
      {/* Top-left rank and suit */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span className="text-base font-bold" style={{ color: suitColor }}>
          {card.rank}
        </span>
        <span className="text-lg leading-none" style={{ color: suitColor }}>
          {suitSymbol}
        </span>
      </div>

      {/* Center suit symbol (large) */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-5xl leading-none" style={{ color: suitColor }}>
          {suitSymbol}
        </div>
      </div>

      {/* Bottom-right rank and suit (rotated) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span className="text-base font-bold" style={{ color: suitColor }}>
          {card.rank}
        </span>
        <span className="text-lg leading-none" style={{ color: suitColor }}>
          {suitSymbol}
        </span>
      </div>

      {/* Selection indicator overlay */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-blue-100 opacity-20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.button>
  );
}
