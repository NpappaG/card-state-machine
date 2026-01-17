import type { Player } from '@/lib/types';

/**
 * Card rank values for scoring
 */
const RANK_VALUES: Record<string, number> = {
  'A': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
};

/**
 * Calculate the total score (sum of rank values) for a player's hand
 */
export function calculateHandScore(player: Player | undefined): number {
  if (!player) return 0;
  return player.hand.reduce((sum, card) => sum + (RANK_VALUES[card.rank] || 0), 0);
}
