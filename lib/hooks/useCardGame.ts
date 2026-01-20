'use client';

import { useMachine, useSelector } from '@xstate/react';
import { useEffect } from 'react';
import type { ActorRefFrom } from 'xstate';
import { cardGameMachine } from '@/machines/cardGameMachine';
import { timerMachine } from '@/machines/timerMachine';
import { useTiming } from '@/lib/contexts/TimingContext';

type TimerActor = ActorRefFrom<typeof timerMachine>;

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
  const timing = useTiming();

  // Sync timing context to state machine
  useEffect(() => {
    send({
      type: 'timing.update',
      timing: {
        CHECKING_DELAY: timing.CHECKING_DELAY,
        AUTO_PLAY_DELAY: timing.AUTO_PLAY_DELAY,
        DRAW_DELAY: timing.DRAW_DELAY,
        EVALUATING_DELAY: timing.EVALUATING_DELAY,
        TURN_CHANGE_DELAY: timing.TURN_CHANGE_DELAY,
        ROUND_DURATION_MS: timing.ROUND_DURATION_MS,
      },
    });
    // Note: `send` is stable in XState but included for linter satisfaction
  }, [
    timing.CHECKING_DELAY,
    timing.AUTO_PLAY_DELAY,
    timing.DRAW_DELAY,
    timing.EVALUATING_DELAY,
    timing.TURN_CHANGE_DELAY,
    timing.ROUND_DURATION_MS,
    send,
  ]);

  // Derived state
  const currentPlayer = snapshot.context.players[snapshot.context.currentPlayerIndex];
  const topDiscard = snapshot.context.discardPile[snapshot.context.discardPile.length - 1];
  const roundDurationMs = snapshot.context.timing.ROUND_DURATION_MS;

  // Timer state comes from timer actor, not context
  // Subscribe directly to timer actor for immediate updates every second
  // Timer only exists during roundActive state, so we guard access
  const timerActor = snapshot.children.timer as TimerActor | undefined;
  const timerFromActor = useSelector(
    timerActor ?? actor, // Fallback to main actor when timer not active
    (state) => {
      // Only read remainingMs if it exists in context (timer actor)
      if (timerActor && 'remainingMs' in state.context) {
        return state.context.remainingMs ?? roundDurationMs;
      }
      return roundDurationMs;
    }
  );
  const timerRemainingMs = snapshot.matches('roundActive') ? timerFromActor : roundDurationMs;
  const timerPercent = (timerRemainingMs / roundDurationMs) * 100;

  const isSetupState = snapshot.matches('setup');

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

    // Timer (read from timer actor)
    timerRemainingMs,
    timerPercent,

    // Scores
    roundScores: snapshot.context.roundScores,

    // State matchers (for conditional rendering)
    isIdle: isSetupState,
    isSetup: isSetupState,
    isRoundActive: snapshot.matches('roundActive'),
    isPaused: snapshot.matches({ roundActive: 'paused' }),
    isPlaying: snapshot.matches({ roundActive: 'playing' }),
    isCheckingCards: snapshot.matches({ roundActive: { playing: { playerTurn: 'checkingCards' } } }),
    isAutoPlaying: snapshot.matches({ roundActive: { playing: { playerTurn: 'autoPlaying' } } }),
    isSelecting: snapshot.matches({ roundActive: { playing: { playerTurn: 'selecting' } } }),
    isDrawing: snapshot.matches({ roundActive: { playing: { playerTurn: 'drawing' } } }),
    isEvaluating: snapshot.matches({ roundActive: { playing: { playerTurn: 'evaluating' } } }),
    isChangingTurn: snapshot.matches({ roundActive: { playing: { playerTurn: 'changingTurn' } } }),
    isRoundEnd: snapshot.matches('roundEnd'),

    // Convenience methods
    canSelectCard: (cardId: string) => {
      if (!currentPlayer || !topDiscard) return false;
      const card = currentPlayer.hand.find((c) => c.id === cardId);
      if (!card) return false;
      if (card.rank !== topDiscard.rank) return false;
      return !snapshot.context.selectedCards.some((c) => c.id === cardId);
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
