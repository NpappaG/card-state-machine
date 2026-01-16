'use client';

import { useMachine } from '@xstate/react';
import { cardGameMachine } from '@/machines/cardGameMachine';

/**
 * Primary React hook for accessing card game state machine.
 *
 * Wraps XState's useMachine and provides convenient accessors for:
 * - Game state (players, deck, discard pile, etc.)
 * - Current player and derived data
 * - State matchers for conditional rendering
 * - Helper methods for card interaction
 *
 * This is the single source of truth for game state in React components.
 */
export function useCardGame() {
  const [snapshot, send, actor] = useMachine(cardGameMachine);

  // Derived state
  const currentPlayer = snapshot.context.players[snapshot.context.currentPlayerIndex];
  const topDiscard = snapshot.context.discardPile[snapshot.context.discardPile.length - 1];
  const timerPercent = (snapshot.context.timerRemainingMs / 180000) * 100;

  return {
    // Core machine interface
    snapshot,
    send,
    actor,

    // Game state accessors
    players: snapshot.context.players,
    currentPlayer,
    currentPlayerIndex: snapshot.context.currentPlayerIndex,
    deck: snapshot.context.deck,
    discardPile: snapshot.context.discardPile,
    topDiscard,
    selectedCards: snapshot.context.selectedCards,

    // Timer
    timerRemainingMs: snapshot.context.timerRemainingMs,
    timerPercent,

    // Scores
    roundScores: snapshot.context.roundScores,

    // State matchers (for conditional rendering)
    isIdle: snapshot.matches('idle'),
    isSetup: snapshot.matches('setup'),
    isRoundActive: snapshot.matches('roundActive'),
    isCheckingCards: snapshot.matches({ roundActive: { playerTurn: 'checkingCards' } }),
    isSelecting: snapshot.matches({ roundActive: { playerTurn: 'selecting' } }),
    isDrawing: snapshot.matches({ roundActive: { playerTurn: 'drawing' } }),
    isEvaluating: snapshot.matches({ roundActive: { playerTurn: 'evaluating' } }),
    isChangingTurn: snapshot.matches({ roundActive: { playerTurn: 'changingTurn' } }),
    isRoundEnd: snapshot.matches('roundEnd'),

    // Convenience methods
    canSelectCard: (cardId: string) => {
      if (!currentPlayer) return false;
      return currentPlayer.hand.some((c) => c.id === cardId) &&
             !snapshot.context.selectedCards.some((c) => c.id === cardId);
    },

    isCardSelected: (cardId: string) => {
      return snapshot.context.selectedCards.some((c) => c.id === cardId);
    },
  };
}

/**
 * Type for the return value of useCardGame hook.
 * Useful for prop types and component interfaces.
 */
export type UseCardGameReturn = ReturnType<typeof useCardGame>;
