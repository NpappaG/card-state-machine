'use client';

import { motion } from 'framer-motion';
import type { Card as CardType, CardAnimationState } from '@/lib/types';
import { buildCardAnimationVariants, cardDrawInitialState, buildCardFlipTiming, buildAmberOverlayConfig } from '@/lib/animations/cardAnimations';
import { useTiming } from '@/lib/contexts/TimingContext';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isDisabled?: boolean;
  animationState?: CardAnimationState;
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
  const timing = useTiming();
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];
  const isActuallyDisabled = isDisabled || disabled;

  // Build animation variants and timing with current context values
  const cardAnimationVariants = buildCardAnimationVariants(timing);
  const cardFlipTiming = buildCardFlipTiming(timing.DRAW_DELAY);

  const glowShadow =
    animationState === 'entering'
      ? 'shadow-[0_0_35px_rgba(37,99,235,0.45)] shadow-lg'
      : animationState === 'autoPlaying'
      ? 'shadow-[0_0_50px_rgba(245,158,11,0.8)] shadow-2xl'
      : 'shadow-lg';

  return (
    <motion.button
      className={`
        relative flex flex-col items-center overflow-hidden rounded-xl border-2 transition-all
        bg-white border-gray-300 ${glowShadow}
        ${isSelected ? 'border-blue-500 ring-4 ring-blue-300' : ''}
        ${animationState === 'autoPlaying' ? 'border-yellow-400 ring-4 ring-yellow-300' : ''}
        ${isActuallyDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-xl'}
        ${animationState === 'exiting' || animationState === 'entering' || animationState === 'autoPlaying' ? 'pointer-events-none' : ''}
      `}
      variants={cardAnimationVariants}
      initial={animationState === 'entering' ? cardDrawInitialState : "idle"}
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
      {/* Card back design (shown when entering/face-down) */}
      {animationState === 'entering' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl"
          style={{ zIndex: 50 }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{
            delay: cardFlipTiming.blueBackDelay,
            duration: cardFlipTiming.blueBackDuration,
          }}
        >
          <div className="absolute inset-2 rounded-lg border-2 border-blue-400/30" />
          <div className="absolute inset-4 rounded border border-blue-400/20" />
          <div className="text-6xl text-white/20 font-bold">♠</div>
        </motion.div>
      )}

      {/* Card face content - starts hidden during entering, fades in at flip */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center"
        style={{ padding: '6px', zIndex: 10 }}
        initial={{ opacity: animationState === 'entering' ? 0 : 1 }}
        animate={{ opacity: 1 }}
        transition={animationState === 'entering' ? {
          delay: cardFlipTiming.faceFadeDelay,
          duration: cardFlipTiming.faceFadeDuration
        } : { duration: 0 }}
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

      {/* Auto-play indicator overlay */}
      {animationState === 'autoPlaying' && (() => {
        const amberConfig = buildAmberOverlayConfig(timing.CHECKING_DELAY);
        return (
          <motion.div
            className="absolute inset-0 rounded-xl bg-amber-100 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: amberConfig.opacity }}
            exit={{ opacity: 0 }}
            transition={amberConfig.transition}
          />
        );
      })()}
    </motion.button>
  );
}
