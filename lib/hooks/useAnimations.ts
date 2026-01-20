'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { UseCardGameReturn } from './useCardGame';
import type { CardAnimationState } from '@/lib/types';

/**
 * Animation state derived from game state machine.
 *
 * Coordinates UI animations with state machine timing delays to ensure
 * animations complete before state transitions occur. Animation durations
 * should be equal to or shorter than their corresponding timing values.
 */
export function useAnimations(game: UseCardGameReturn) {
  const [lastPlayedCards, setLastPlayedCards] = useState<string[]>([]);
  const [lastDrawnCard, setLastDrawnCard] = useState<string | null>(null);

  // Track previous state values to detect transitions
  const prevIsEvaluating = useRef(false);
  const prevIsDrawing = useRef(false);
  const prevDiscardPileLength = useRef(game.discardPile.length);

  // Get dynamic timing from game machine context
  const timing = game.snapshot.context.timing;

  // Detect auto-play during autoPlaying phase (derived state, no effect needed)
  const autoPlayingCards = useMemo(() => {
    if (game.isAutoPlaying && game.currentPlayer && game.discardPile.length > 0) {
      const topCard = game.discardPile[game.discardPile.length - 1];
      const matchingCards = game.currentPlayer.hand.filter(c => c.rank === topCard.rank);

      // If exactly one matching card, mark it for auto-play animation
      if (matchingCards.length === 1) {
        return [matchingCards[0].id];
      }
    }
    return [];
  }, [game.isAutoPlaying, game.currentPlayer, game.discardPile]);

  // Track cards that were just played (for exit animations)
  // Only update when transitioning INTO evaluating state (false -> true)
  useEffect(() => {
    if (game.isEvaluating && !prevIsEvaluating.current) {
      // Capture only when new cards were added to the discard pile.
      const cardsAdded = game.discardPile.length - prevDiscardPileLength.current;

      if (cardsAdded > 0) {
        const topCards = game.discardPile.slice(-cardsAdded);
        const playedCardIds = topCards.map((c) => c.id);
        setLastPlayedCards(playedCardIds);
      } else {
        setLastPlayedCards([]);
      }
    }
    prevIsEvaluating.current = game.isEvaluating;
    prevDiscardPileLength.current = game.discardPile.length;
  }, [game.isEvaluating, game.discardPile]);

  // Track cards that were just drawn
  // Only update when transitioning INTO drawing state (false -> true)
  useEffect(() => {
    if (game.isDrawing && !prevIsDrawing.current && game.currentPlayer?.hand.length) {
      const lastCard = game.currentPlayer.hand[game.currentPlayer.hand.length - 1];
      // Safe: only updates on state transition (false -> true), not on every render
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastDrawnCard(lastCard?.id || null);
    }
    prevIsDrawing.current = game.isDrawing;
  }, [game.isDrawing, game.currentPlayer?.hand]);

  // Clear after animation window
  useEffect(() => {
    if (!game.isEvaluating && lastPlayedCards.length > 0) {
      const timeout = setTimeout(() => {
        setLastPlayedCards([]);
      }, timing.EVALUATING_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [game.isEvaluating, lastPlayedCards.length, timing.EVALUATING_DELAY]);

  // Clear drawn card after animation
  useEffect(() => {
    if (!game.isDrawing && lastDrawnCard) {
      const timeout = setTimeout(() => {
        setLastDrawnCard(null);
      }, timing.DRAW_DELAY);
      return () => clearTimeout(timeout);
    }
  }, [game.isDrawing, lastDrawnCard, timing.DRAW_DELAY]);

  return {
    // State-based animation flags
    shouldShowCheckingFeedback: game.isCheckingCards,
    shouldAnimateCardPlay: game.isEvaluating,
    shouldAnimateCardDraw: game.isDrawing,
    shouldAnimateTurnChange: game.isChangingTurn,

    // Animation timing (dynamically pulled from game machine context)
    timing: {
      checking: timing.CHECKING_DELAY,
      cardPlay: timing.EVALUATING_DELAY, // Used for both auto-play and manual play
      cardDraw: timing.DRAW_DELAY,
      turnChange: timing.TURN_CHANGE_DELAY,
    },

    // Recently played cards (for exit animations)
    lastPlayedCards,
    lastDrawnCard,
    autoPlayingCards,

    // Helpers for common animation patterns
    getCardAnimationState: (cardId: string): CardAnimationState => {
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
