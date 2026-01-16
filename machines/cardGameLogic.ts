import type { GameContext, Card, Player, Suit, Rank } from '@/lib/types';
import { GAME_TIMING } from '@/lib/constants';

// ============================================================================
// GUARD FUNCTIONS (Pure, Testable)
// ============================================================================

/**
 * Check if selected cards can be played on the current discard pile.
 * Must have exactly one card selected that matches the top discard card rank.
 */
export function canPlaySelectedCards(context: GameContext): boolean {
  // Must have exactly one card selected
  if (context.selectedCards.length !== 1) return false;

  const topCard = context.discardPile[context.discardPile.length - 1];
  return context.selectedCards[0].rank === topCard.rank;
}

/**
 * Check if the current player has multiple valid cards to play.
 * Used to determine if player should enter "selecting" state.
 */
export function hasMultipleValidCards(context: GameContext): boolean {
  const currentPlayer = context.players[context.currentPlayerIndex];
  const topCard = context.discardPile[context.discardPile.length - 1];

  const validCards = currentPlayer.hand.filter((card) => card.rank === topCard.rank);
  return validCards.length > 1;
}

/**
 * Check if the current player has exactly one valid card to play.
 * Used to trigger auto-play behavior.
 */
export function hasSingleValidCard(context: GameContext): boolean {
  const currentPlayer = context.players[context.currentPlayerIndex];
  const topCard = context.discardPile[context.discardPile.length - 1];

  const validCards = currentPlayer.hand.filter((card) => card.rank === topCard.rank);
  return validCards.length === 1;
}

/**
 * Check if the current player has no cards left in their hand.
 * Win condition: first player to empty their hand wins the round.
 */
export function currentPlayerHasNoCards(context: GameContext): boolean {
  const currentPlayer = context.players[context.currentPlayerIndex];
  return currentPlayer.hand.length === 0;
}

/**
 * Check if the round timer has expired.
 * Win condition: when timer reaches 0, round ends.
 */
export function timerExpired(context: GameContext): boolean {
  return context.timerRemainingMs <= 0;
}

/**
 * Check if the deck is empty (no cards left to draw).
 * Edge case: player must draw but deck is empty.
 */
export function deckEmpty(context: GameContext): boolean {
  return context.deck.length === 0;
}

// ============================================================================
// HELPER FUNCTIONS (Pure)
// ============================================================================

/**
 * Create a standard 52-card deck.
 */
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const values: Record<Rank, number> = {
    A: 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    J: 11,
    Q: 12,
    K: 13,
  };

  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: values[rank],
        id: `${suit}-${rank}`,
      });
    }
  }
  return deck;
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * Returns a new array (does not mutate original).
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get random integer between 0 (inclusive) and max (exclusive).
 */
export function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// ============================================================================
// ACTION REDUCER FUNCTIONS (Pure, Testable)
// ============================================================================

/**
 * Initialize a new game with the specified player count and names.
 * Deals 5 cards to each player, 1 card to discard pile, selects random first player.
 */
export function initializeGameReducer(
  playerCount: number,
  playerNames?: string[]
): GameContext {
  const clampedPlayerCount = Math.max(2, Math.min(4, playerCount));

  // Create and shuffle deck
  const shuffledDeck = shuffle(createDeck());

  // Deal 5 cards to each player (pure - no mutation)
  const players: Player[] = Array.from({ length: clampedPlayerCount }, (_, i) => {
    const startIdx = i * 5;
    return {
      id: `player-${i + 1}`,
      name: playerNames?.[i] || `Player ${i + 1}`,
      hand: shuffledDeck.slice(startIdx, startIdx + 5),
      score: 0,
    };
  });

  // Calculate remaining deck position
  const deckStartIdx = clampedPlayerCount * 5;

  // Deal one card to discard pile
  const discardPile = [shuffledDeck[deckStartIdx]];

  // Remaining deck
  const deck = shuffledDeck.slice(deckStartIdx + 1);

  // Select random first player
  const currentPlayerIndex = randomInt(clampedPlayerCount);

  return {
    players,
    currentPlayerIndex,
    deck,
    discardPile,
    selectedCards: [],
    timerStartMs: performance.now(),
    timerRemainingMs: GAME_TIMING.ROUND_DURATION_MS,
    roundScores: Object.fromEntries(players.map((p) => [p.id, 0])),
  };
}

/**
 * Start/reset the timer.
 */
export function startTimerReducer(context: GameContext): GameContext {
  return {
    ...context,
    timerStartMs: performance.now(),
  };
}

/**
 * Add a card to the selected cards array.
 */
export function selectCardReducer(context: GameContext, cardId: string): GameContext {
  const currentPlayer = context.players[context.currentPlayerIndex];
  const card = currentPlayer.hand.find((c) => c.id === cardId);

  // Card not found or already selected
  if (!card || context.selectedCards.some((c) => c.id === card.id)) {
    return context;
  }

  return {
    ...context,
    selectedCards: [...context.selectedCards, card],
  };
}

/**
 * Remove a card from the selected cards array.
 */
export function deselectCardReducer(context: GameContext, cardId: string): GameContext {
  return {
    ...context,
    selectedCards: context.selectedCards.filter((c) => c.id !== cardId),
  };
}

/**
 * Play all currently selected cards to the discard pile.
 * Removes cards from current player's hand.
 */
export function playSelectedCardsReducer(context: GameContext): GameContext {
  const currentPlayer = context.players[context.currentPlayerIndex];

  // Remove selected cards from hand and add to discard pile
  const newHand = currentPlayer.hand.filter(
    (card) => !context.selectedCards.some((sc) => sc.id === card.id)
  );

  const updatedPlayers = context.players.map((player, idx) =>
    idx === context.currentPlayerIndex ? { ...player, hand: newHand } : player
  );

  return {
    ...context,
    players: updatedPlayers,
    discardPile: [...context.discardPile, ...context.selectedCards],
    selectedCards: [],
  };
}

/**
 * Automatically play a single valid card (when player has exactly one matching card).
 */
export function autoPlaySingleCardReducer(context: GameContext): GameContext {
  const currentPlayer = context.players[context.currentPlayerIndex];
  const topCard = context.discardPile[context.discardPile.length - 1];

  // Find the single valid card
  const validCard = currentPlayer.hand.find((card) => card.rank === topCard.rank);

  if (!validCard) return context;

  // Remove card from hand and add to discard pile
  const newHand = currentPlayer.hand.filter((c) => c.id !== validCard.id);

  const updatedPlayers = context.players.map((player, idx) =>
    idx === context.currentPlayerIndex ? { ...player, hand: newHand } : player
  );

  return {
    ...context,
    players: updatedPlayers,
    discardPile: [...context.discardPile, validCard],
  };
}

/**
 * Draw one card from the deck and add to current player's hand.
 */
export function drawCardReducer(context: GameContext): GameContext {
  if (context.deck.length === 0) return context;

  const currentPlayer = context.players[context.currentPlayerIndex];
  const drawnCard = context.deck[0];
  const newHand = [...currentPlayer.hand, drawnCard];

  const updatedPlayers = context.players.map((player, idx) =>
    idx === context.currentPlayerIndex ? { ...player, hand: newHand } : player
  );

  return {
    ...context,
    players: updatedPlayers,
    deck: context.deck.slice(1),
  };
}

/**
 * Advance to the next player's turn.
 * Clears selected cards and cycles player index.
 */
export function advanceTurnReducer(context: GameContext): GameContext {
  return {
    ...context,
    currentPlayerIndex: (context.currentPlayerIndex + 1) % context.players.length,
    selectedCards: [],
  };
}

/**
 * Update the timer based on elapsed time.
 */
export function updateTimerReducer(context: GameContext): GameContext {
  const elapsed = performance.now() - context.timerStartMs;
  const remaining = Math.max(0, GAME_TIMING.ROUND_DURATION_MS - elapsed);

  return {
    ...context,
    timerRemainingMs: remaining,
  };
}

/**
 * Calculate final scores for all players based on remaining cards in hand.
 */
export function calculateScoresReducer(context: GameContext): GameContext {
  const roundScores: Record<string, number> = {};

  context.players.forEach((player) => {
    const score = player.hand.reduce((sum, card) => sum + card.value, 0);
    roundScores[player.id] = score;
  });

  return {
    ...context,
    roundScores,
  };
}
