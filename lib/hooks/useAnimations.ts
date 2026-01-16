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
  const [lastDrawnCard, setLastDrawnCard] = useState<string | null>(null);
  const [autoPlayingCards, setAutoPlayingCards] = useState<string[]>([]);

  // Detect auto-play during checkingCards phase
  useEffect(() => {
    if (game.isCheckingCards && game.currentPlayer && game.discardPile.length > 0) {
      const topCard = game.discardPile[game.discardPile.length - 1];
      const matchingCards = game.currentPlayer.hand.filter(c => c.rank === topCard.rank);

      // If exactly one matching card, mark it for auto-play animation
      if (matchingCards.length === 1) {
        setAutoPlayingCards([matchingCards[0].id]);
      } else {
        setAutoPlayingCards([]);
      }
    } else if (!game.isCheckingCards) {
      // Clear auto-playing cards when we leave checkingCards
      setAutoPlayingCards([]);
    }
  }, [game.isCheckingCards, game.currentPlayer, game.discardPile]);

  // Track cards that were just played (for exit animations)
  useEffect(() => {
    if (game.isEvaluating && game.discardPile.length > 0) {
      const topCards = game.discardPile.slice(-game.selectedCards.length || -1);
      const playedCardIds = topCards.map((c) => c.id);
      setLastPlayedCards(playedCardIds);
    }
  }, [game.isEvaluating, game.discardPile, game.selectedCards.length]);

  // Track cards that were just drawn
  useEffect(() => {
    if (game.isDrawing && game.currentPlayer?.hand.length) {
      const lastCard = game.currentPlayer.hand[game.currentPlayer.hand.length - 1];
      setLastDrawnCard(lastCard?.id || null);
    }
  }, [game.isDrawing, game.currentPlayer?.hand]);

  // Clear after animation window
  useEffect(() => {
    if (!game.isEvaluating && lastPlayedCards.length > 0) {
      const timeout = setTimeout(() => {
        setLastPlayedCards([]);
      }, GAME_TIMING.EVALUATING_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [game.isEvaluating, lastPlayedCards.length]);

  // Clear drawn card after animation
  useEffect(() => {
    if (!game.isDrawing && lastDrawnCard) {
      const timeout = setTimeout(() => {
        setLastDrawnCard(null);
      }, GAME_TIMING.DRAW_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [game.isDrawing, lastDrawnCard]);

  return {
    // State-based animation flags
    shouldShowCheckingFeedback: game.isCheckingCards,
    shouldAnimateCardPlay: game.isEvaluating,
    shouldAnimateCardDraw: game.isDrawing,
    shouldAnimateTurnChange: game.isChangingTurn,

    // Animation timing (match these in Framer Motion components)
    timing: {
      checking: GAME_TIMING.CHECKING_DELAY,
      cardPlay: GAME_TIMING.EVALUATING_DELAY, // Used for both auto-play and manual play
      cardDraw: GAME_TIMING.DRAW_DELAY,
      turnChange: GAME_TIMING.TURN_CHANGE_DELAY,
    },

    // Recently played cards (for exit animations)
    lastPlayedCards,
    lastDrawnCard,
    autoPlayingCards,

    // Helpers for common animation patterns
    getCardAnimationState: (cardId: string) => {
      if (autoPlayingCards.includes(cardId)) {
        return 'autoPlaying'; // Card is auto-playing (pulse + fling)
      }
      if (lastPlayedCards.includes(cardId)) {
        return 'exiting'; // Card is flying to discard
      }
      if (lastDrawnCard === cardId) {
        return 'entering'; // Card is being drawn
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
