/**
 * Game Timing Constants
 *
 * Centralized timing configuration for the card game state machine.
 * These delays create breathing room between automatic state transitions,
 * allowing animations and UI updates to be visible to players.
 *
 * WHY DELAYS IN THE STATE MACHINE?
 * Without delays, `always` transitions fire synchronously, causing the game
 * to cascade through multiple states (checkingCards → drawing → evaluating →
 * changingTurn) in milliseconds. This creates an unplayable experience where
 * 25+ cards can be auto-played before the UI can render a single frame.
 *
 * We chose "pragmatic delays" (Option B from architecture discussion):
 * - Wrap `always` transition branches in `after: { DELAY: ... }` blocks
 * - Simple to implement and reason about
 * - State machine enforces timing (not relying on UI events)
 * - Slight impurity (time-based) but massive UX improvement
 *
 * IMPORTANT: Animation durations in UI components should match or be shorter
 * than these delays to ensure smooth visual flow.
 */

export const GAME_TIMING = {
  /**
   * Delay before checking which cards are playable.
   * Gives players a moment to see the current game state before action.
   */
  CHECKING_DELAY: 300,

  /**
   * Delay after drawing a card when player has no matches.
   * Shows the card moving from deck to hand.
   */
  DRAW_DELAY: 500,

  /**
   * Pause after playing a card (auto or manual) before determining next action.
   * Creates visual separation between play and turn change.
   * Used for both auto-play and manual play animations.
   */
  EVALUATING_DELAY: 400,

  /**
   * Delay during turn change.
   * Shows turn transition and gives players time to orient.
   */
  TURN_CHANGE_DELAY: 500,

  /**
   * Round timer duration (3 minutes in milliseconds).
   * When timer expires, round ends and scores are calculated.
   */
  ROUND_DURATION_MS: 180000,
} as const;

/**
 * Type helper for timing keys (useful for tests and hooks)
 */
export type TimingKey = keyof typeof GAME_TIMING;

/**
 * Get timing value by key (useful for dynamic lookups)
 */
export function getTimingValue(key: TimingKey): number {
  return GAME_TIMING[key];
}
