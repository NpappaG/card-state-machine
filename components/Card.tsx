'use client';

import { motion } from 'framer-motion';
import type { Card as CardType } from '@/lib/types';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isDisabled?: boolean;
  animationState?: 'idle' | 'selected' | 'exiting' | 'inHand' | 'entering';
  onClick?: () => void;
  layoutId?: string;
  disabled?: boolean;
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
  layoutId,
  disabled = false,
}: CardProps) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];

  // Animation variants
  const variants = {
    idle: {
      scale: 1,
      y: 0,
      x: 0,
      rotate: 0,
      opacity: 1,
    },
    selected: {
      scale: 1.05,
      y: -10,
      x: 0,
      rotate: 0,
      opacity: 1,
    },
    entering: {
      scale: 1,
      y: 0,
      x: 0,
      rotate: 0,
      rotateY: 0,
      opacity: 1,
      transition: {
        duration: 2.0,
        ease: [0.4, 0, 0.2, 1], // Custom easeIn curve
      },
    },
    exiting: {
      scale: 0.9,
      x: 0,
      y: 0,
      rotate: 0,
      opacity: 1,
      transition: {
        duration: 2.0,
        type: 'spring',
        stiffness: 80,
        damping: 15,
      },
    },
    inHand: {
      scale: 1,
      y: 0,
      x: 0,
      rotate: 0,
      opacity: 1,
    },
  };

  const isActuallyDisabled = isDisabled || disabled;

  const glowShadow =
    animationState === 'entering'
      ? 'shadow-[0_0_35px_rgba(37,99,235,0.45)] shadow-lg'
      : 'shadow-lg';

  return (
    <motion.button
      className={`
        relative flex flex-col items-center overflow-hidden rounded-xl border-2 transition-all
        bg-white border-gray-300 ${glowShadow}
        ${isSelected ? 'border-blue-500 ring-4 ring-blue-300' : ''}
        ${isActuallyDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-xl'}
        ${animationState === 'exiting' || animationState === 'entering' ? 'pointer-events-none' : ''}
      `}
      variants={variants}
      initial={animationState === 'entering' ? {
        y: -200,
        x: -250,
        scale: 0.7,
        rotate: -15,
        rotateY: 180,
        opacity: 1
      } : "idle"}
      animate={isSelected ? 'selected' : animationState}
      whileHover={!isActuallyDisabled && !isSelected ? { scale: 1.02 } : undefined}
      whileTap={!isActuallyDisabled ? { scale: 0.98 } : undefined}
      onClick={!isActuallyDisabled ? onClick : undefined}
      disabled={isActuallyDisabled}
      layout
      layoutId={layoutId}
      style={{
        width: '100px',
        height: '140px',
        padding: '6px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Card back design (shown when entering/face-down) - Hidden exactly at 90deg rotation */}
      {animationState === 'entering' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl z-40"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{
            delay: 1.0,
            duration: 0.001,
          }}
        >
          <div className="absolute inset-2 rounded-lg border-2 border-blue-400/30" />
          <div className="absolute inset-4 rounded border border-blue-400/20" />
          <div className="text-6xl text-white/20 font-bold">♠</div>
        </motion.div>
      )}

      {/* Card face content - hidden during flip */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center"
        style={{ padding: '6px' }}
        initial={animationState === 'entering' ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={animationState === 'entering' ? { delay: 1.0, duration: 0.1 } : {}}
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
      </motion.div>

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
