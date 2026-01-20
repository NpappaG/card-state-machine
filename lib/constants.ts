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
   * Brief delay for decision logic in checkingCards state.
   * Just long enough to show the current game state before routing.
   * Reduced from 1000ms now that auto-play has its own animation state.
   */
  CHECKING_DELAY: 200,

  /**
   * Delay for auto-play animation when exactly one card matches.
   * Shows amber highlight and card preparation before playing.
   * This is the dedicated animation window for auto-play.
   */
  AUTO_PLAY_DELAY: 1000,

  /**
   * Delay after drawing a card when player has no matches.
   * Shows the card moving from deck to hand and flipping.
   */
  DRAW_DELAY: 1155,

  /**
   * Visual breathing room for evaluating play and changing turns.
   */
  EVALUATING_DELAY: 400,
  TURN_CHANGE_DELAY: 400,

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
