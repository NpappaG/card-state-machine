/**
 * Helper utilities for reading timer state from the timer actor.
 *
 * The timer machine owns all timer state. When you need to access
 * timer values (for display, guards, etc.), read from the actor's snapshot.
 */

import type { ActorRefFrom } from "xstate";
import type { timerMachine } from "./timerMachine";

type TimerActor = ActorRefFrom<typeof timerMachine>;

/**
 * Get the remaining time in milliseconds from a timer actor.
 * Returns 0 if the actor is not available or in an unexpected state.
 *
 * @example
 * // In a component with access to the game machine actor
 * const gameActor = useActor(cardGameMachine);
 * const timerActor = gameActor.system.get('timer');
 * const remainingMs = getTimerRemainingMs(timerActor);
 */
export function getTimerRemainingMs(timerActor: TimerActor | undefined): number {
  if (!timerActor) return 0;
  const snapshot = timerActor.getSnapshot();
  return snapshot.context.remainingMs;
}

/**
 * Check if the timer has expired.
 *
 * @example
 * // In a guard function
 * guards: {
 *   timerExpired: ({ self }) => {
 *     const timerActor = self.system.get('timer');
 *     return isTimerExpired(timerActor);
 *   }
 * }
 */
export function isTimerExpired(timerActor: TimerActor | undefined): boolean {
  if (!timerActor) return false;
  const snapshot = timerActor.getSnapshot();
  return snapshot.context.remainingMs <= 0 || snapshot.matches('expired');
}

/**
 * Check if the timer is currently paused.
 */
export function isTimerPaused(timerActor: TimerActor | undefined): boolean {
  if (!timerActor) return false;
  const snapshot = timerActor.getSnapshot();
  return snapshot.matches('paused');
}

/**
 * Get a formatted time string (MM:SS) from milliseconds.
 *
 * @example
 * const timerActor = gameActor.system.get('timer');
 * const remainingMs = getTimerRemainingMs(timerActor);
 * const display = formatTime(remainingMs); // "02:45"
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
