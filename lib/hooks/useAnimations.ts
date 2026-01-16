'use client';

import { useEffect, useState } from 'react';
import { GAME_TIMING } from '@/lib/constants';
import type { UseCardGameReturn } from './useCardGame';

/**
 * Animation state derived from game state machine.
 *
 * Coordinates UI animations with state machine timing delays to ensure
 * animations complete before state transitions occur. Animation durations
 * should be equal to or shorter than their corresponding GAME_TIMING values.
 */
export function useAnimations(game: UseCardGameReturn) {
  const [lastPlayedCards, setLastPlayedCards] = useState<string[]>([]);

  // Track cards that were just played (for exit animations)
  useEffect(() => {
    if (game.isEvaluating && game.discardPile.length > 0) {
      const topCards = game.discardPile.slice(-game.selectedCards.length || -1);
      setLastPlayedCards(topCards.map((c) => c.id));
    }
  }, [game.isEvaluating, game.discardPile, game.selectedCards.length]);

  // Clear after animation window
  useEffect(() => {
    if (!game.isEvaluating && lastPlayedCards.length > 0) {
      const timeout = setTimeout(() => {
        setLastPlayedCards([]);
      }, GAME_TIMING.EVALUATING_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [game.isEvaluating, lastPlayedCards.length]);

  return {
    // State-based animation flags
    shouldShowCheckingFeedback: game.isCheckingCards,
    shouldAnimateCardPlay: game.isEvaluating,
    shouldAnimateCardDraw: game.isDrawing,
    shouldAnimateTurnChange: game.isChangingTurn,

    // Animation timing (match these in Framer Motion components)
    timing: {
      checking: GAME_TIMING.CHECKING_DELAY,
      cardPlay: GAME_TIMING.EVALUATING_DELAY,
      cardDraw: GAME_TIMING.DRAW_DELAY,
      turnChange: GAME_TIMING.TURN_CHANGE_DELAY,
      autoPlay: GAME_TIMING.AUTO_PLAY_DELAY,
    },

    // Recently played cards (for exit animations)
    lastPlayedCards,

    // Helpers for common animation patterns
    getCardAnimationState: (cardId: string) => {
      if (lastPlayedCards.includes(cardId)) {
        return 'exiting'; // Card is flying to discard
      }
      if (game.isCardSelected(cardId)) {
        return 'selected'; // Card is marked for play
      }
      if (game.currentPlayer?.hand.some((c) => c.id === cardId)) {
        return 'inHand'; // Card is in current player's hand
      }
      return 'idle';
    },

    // Timer progress for visual effects
    timerProgress: game.timerPercent,
    isTimerLow: game.timerPercent < 20, // Last 36 seconds
    isTimerCritical: game.timerPercent < 10, // Last 18 seconds
  };
}

/**
 * Type for the return value of useAnimations hook.
 */
export type UseAnimationsReturn = ReturnType<typeof useAnimations>;
