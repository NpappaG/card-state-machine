import { test, expect, describe } from 'bun:test';
import * as Logic from '../machines/cardGameLogic';
import type { Card, GameContext, Player, Rank, Suit } from '../lib/types';

// ============================================================================
// Test Helpers
// ============================================================================

function makeCard(rank: Rank, suit: Suit = 'hearts'): Card {
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

  return {
    id: `${suit}-${rank}`,
    rank,
    suit,
    value: values[rank],
  };
}

function makePlayer(hand: Card[], id = 'player-1'): Player {
  return { id, name: id, hand, score: 0 };
}

function makeContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    players: overrides.players ?? [makePlayer([])],
    currentPlayerIndex: overrides.currentPlayerIndex ?? 0,
    deck: overrides.deck ?? [],
    discardPile: overrides.discardPile ?? [makeCard('K')],
    selectedCards: overrides.selectedCards ?? [],
    timerStartMs: overrides.timerStartMs ?? 0,
    timerRemainingMs: overrides.timerRemainingMs ?? 180000,
    roundScores: overrides.roundScores ?? {},
  };
}

// ============================================================================
// Guard Tests: canPlaySelectedCards
// ============================================================================

describe('canPlaySelectedCards', () => {
  test('returns false when no cards are selected', () => {
    const context = makeContext({
      discardPile: [makeCard('K')],
      selectedCards: [],
    });

    expect(Logic.canPlaySelectedCards(context)).toBe(false);
  });

  test('returns true when single selected card matches top discard', () => {
    const topCard = makeCard('7', 'hearts');
    const selectedCard = makeCard('7', 'spades');

    const context = makeContext({
      discardPile: [makeCard('K'), topCard],
      selectedCards: [selectedCard],
    });

    expect(Logic.canPlaySelectedCards(context)).toBe(true);
  });

  test('returns false when multiple cards are selected (only single card allowed)', () => {
    const topCard = makeCard('Q', 'hearts');
    const selected1 = makeCard('Q', 'spades');
    const selected2 = makeCard('Q', 'diamonds');

    const context = makeContext({
      discardPile: [topCard],
      selectedCards: [selected1, selected2],
    });

    expect(Logic.canPlaySelectedCards(context)).toBe(false);
  });

  test('returns false when selected card has different rank than top discard', () => {
    const topCard = makeCard('A', 'hearts');
    const selectedCard = makeCard('K', 'hearts');

    const context = makeContext({
      discardPile: [topCard],
      selectedCards: [selectedCard],
    });

    expect(Logic.canPlaySelectedCards(context)).toBe(false);
  });
});

// ============================================================================
// Guard Tests: hasMultipleValidCards
// ============================================================================

describe('hasMultipleValidCards', () => {
  test('returns false when player has no cards', () => {
    const context = makeContext({
      players: [makePlayer([])],
      discardPile: [makeCard('K')],
    });

    expect(Logic.hasMultipleValidCards(context)).toBe(false);
  });

  test('returns false when player has no matching cards', () => {
    const topCard = makeCard('8', 'hearts');
    const player = makePlayer([makeCard('2'), makeCard('5'), makeCard('Q')]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasMultipleValidCards(context)).toBe(false);
  });

  test('returns false when player has exactly one matching card', () => {
    const topCard = makeCard('J', 'hearts');
    const player = makePlayer([makeCard('J', 'spades'), makeCard('3'), makeCard('7')]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasMultipleValidCards(context)).toBe(false);
  });

  test('returns true when player has two matching cards', () => {
    const topCard = makeCard('9', 'hearts');
    const player = makePlayer([makeCard('9', 'spades'), makeCard('9', 'diamonds'), makeCard('A')]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasMultipleValidCards(context)).toBe(true);
  });

  test('returns true when player has three matching cards', () => {
    const topCard = makeCard('4', 'hearts');
    const player = makePlayer([
      makeCard('4', 'spades'),
      makeCard('4', 'diamonds'),
      makeCard('4', 'clubs'),
      makeCard('K'),
    ]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasMultipleValidCards(context)).toBe(true);
  });

  test('checks current player, not other players', () => {
    const topCard = makeCard('6', 'hearts');
    const player1 = makePlayer([makeCard('K')], 'player-1'); // Current player
    const player2 = makePlayer([makeCard('6', 'spades'), makeCard('6', 'diamonds')], 'player-2');

    const context = makeContext({
      players: [player1, player2],
      currentPlayerIndex: 0, // Player 1 is current
      discardPile: [topCard],
    });

    expect(Logic.hasMultipleValidCards(context)).toBe(false);
  });
});

// ============================================================================
// Guard Tests: hasSingleValidCard
// ============================================================================

describe('hasSingleValidCard', () => {
  test('returns false when player has no cards', () => {
    const context = makeContext({
      players: [makePlayer([])],
      discardPile: [makeCard('K')],
    });

    expect(Logic.hasSingleValidCard(context)).toBe(false);
  });

  test('returns false when player has no matching cards', () => {
    const topCard = makeCard('3', 'hearts');
    const player = makePlayer([makeCard('7'), makeCard('J'), makeCard('A')]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasSingleValidCard(context)).toBe(false);
  });

  test('returns true when player has exactly one matching card', () => {
    const topCard = makeCard('10', 'hearts');
    const player = makePlayer([makeCard('10', 'spades'), makeCard('2'), makeCard('Q')]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasSingleValidCard(context)).toBe(true);
  });

  test('returns false when player has two matching cards', () => {
    const topCard = makeCard('K', 'hearts');
    const player = makePlayer([makeCard('K', 'spades'), makeCard('K', 'diamonds'), makeCard('5')]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasSingleValidCard(context)).toBe(false);
  });

  test('returns false when player has three matching cards', () => {
    const topCard = makeCard('A', 'hearts');
    const player = makePlayer([
      makeCard('A', 'spades'),
      makeCard('A', 'diamonds'),
      makeCard('A', 'clubs'),
    ]);

    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    expect(Logic.hasSingleValidCard(context)).toBe(false);
  });

  test('checks current player, not other players', () => {
    const topCard = makeCard('2', 'hearts');
    const player1 = makePlayer([makeCard('K'), makeCard('Q')], 'player-1'); // Current player
    const player2 = makePlayer([makeCard('2', 'spades')], 'player-2');

    const context = makeContext({
      players: [player1, player2],
      currentPlayerIndex: 0, // Player 1 is current
      discardPile: [topCard],
    });

    expect(Logic.hasSingleValidCard(context)).toBe(false);
  });
});

// ============================================================================
// Guard Tests: currentPlayerHasNoCards
// ============================================================================

describe('currentPlayerHasNoCards', () => {
  test('returns true when current player hand is empty', () => {
    const player1 = makePlayer([], 'player-1');
    const player2 = makePlayer([makeCard('K'), makeCard('Q')], 'player-2');

    const context = makeContext({
      players: [player1, player2],
      currentPlayerIndex: 0,
    });

    expect(Logic.currentPlayerHasNoCards(context)).toBe(true);
  });

  test('returns false when current player has one card', () => {
    const player = makePlayer([makeCard('A')]);

    const context = makeContext({
      players: [player],
      currentPlayerIndex: 0,
    });

    expect(Logic.currentPlayerHasNoCards(context)).toBe(false);
  });

  test('returns false when current player has multiple cards', () => {
    const player = makePlayer([makeCard('3'), makeCard('7'), makeCard('J')]);

    const context = makeContext({
      players: [player],
      currentPlayerIndex: 0,
    });

    expect(Logic.currentPlayerHasNoCards(context)).toBe(false);
  });

  test('checks current player, not other players', () => {
    const player1 = makePlayer([makeCard('K')], 'player-1'); // Current player
    const player2 = makePlayer([], 'player-2'); // Empty hand

    const context = makeContext({
      players: [player1, player2],
      currentPlayerIndex: 0, // Player 1 is current
    });

    expect(Logic.currentPlayerHasNoCards(context)).toBe(false);
  });

  test('works with different currentPlayerIndex', () => {
    const player1 = makePlayer([makeCard('K')], 'player-1');
    const player2 = makePlayer([], 'player-2'); // Empty hand
    const player3 = makePlayer([makeCard('Q')], 'player-3');

    const context = makeContext({
      players: [player1, player2, player3],
      currentPlayerIndex: 1, // Player 2 is current (empty hand)
    });

    expect(Logic.currentPlayerHasNoCards(context)).toBe(true);
  });
});

// ============================================================================
// Guard Tests: timerExpired
// ============================================================================

describe('timerExpired', () => {
  test('returns true when timer is at 0', () => {
    const context = makeContext({
      timerRemainingMs: 0,
    });

    expect(Logic.timerExpired(context)).toBe(true);
  });

  test('returns true when timer is negative (edge case)', () => {
    const context = makeContext({
      timerRemainingMs: -100,
    });

    expect(Logic.timerExpired(context)).toBe(true);
  });

  test('returns false when timer has 1ms remaining', () => {
    const context = makeContext({
      timerRemainingMs: 1,
    });

    expect(Logic.timerExpired(context)).toBe(false);
  });

  test('returns false when timer is at full duration (180 seconds)', () => {
    const context = makeContext({
      timerRemainingMs: 180000,
    });

    expect(Logic.timerExpired(context)).toBe(false);
  });

  test('returns false when timer has 10 seconds remaining', () => {
    const context = makeContext({
      timerRemainingMs: 10000,
    });

    expect(Logic.timerExpired(context)).toBe(false);
  });
});

// ============================================================================
// Guard Tests: deckEmpty
// ============================================================================

describe('deckEmpty', () => {
  test('returns true when deck is empty array', () => {
    const context = makeContext({
      deck: [],
    });

    expect(Logic.deckEmpty(context)).toBe(true);
  });

  test('returns false when deck has one card', () => {
    const context = makeContext({
      deck: [makeCard('A')],
    });

    expect(Logic.deckEmpty(context)).toBe(false);
  });

  test('returns false when deck has multiple cards', () => {
    const context = makeContext({
      deck: [makeCard('K'), makeCard('Q'), makeCard('J')],
    });

    expect(Logic.deckEmpty(context)).toBe(false);
  });

  test('returns false when deck is full (52 cards)', () => {
    const fullDeck: Card[] = [];
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    for (const suit of suits) {
      for (const rank of ranks) {
        fullDeck.push(makeCard(rank, suit));
      }
    }

    const context = makeContext({
      deck: fullDeck,
    });

    expect(Logic.deckEmpty(context)).toBe(false);
    expect(context.deck.length).toBe(52);
  });
});

// ============================================================================
// Action Reducer Tests: Immutability & Behavior
// ============================================================================

describe('initializeGameReducer', () => {
  test('creates correct number of players', () => {
    const context = Logic.initializeGameReducer(2);
    expect(context.players.length).toBe(2);
  });

  test('clamps player count to 2-4 range', () => {
    const contextTooLow = Logic.initializeGameReducer(1);
    expect(contextTooLow.players.length).toBe(2);

    const contextTooHigh = Logic.initializeGameReducer(10);
    expect(contextTooHigh.players.length).toBe(4);
  });

  test('deals 5 cards to each player', () => {
    const context = Logic.initializeGameReducer(3);
    context.players.forEach((player) => {
      expect(player.hand.length).toBe(5);
    });
  });

  test('places 1 card in discard pile', () => {
    const context = Logic.initializeGameReducer(2);
    expect(context.discardPile.length).toBe(1);
  });

  test('remaining deck has correct number of cards', () => {
    const context = Logic.initializeGameReducer(2);
    // 52 - (2 players * 5 cards) - 1 discard = 41 cards
    expect(context.deck.length).toBe(41);
  });

  test('uses custom player names when provided', () => {
    const context = Logic.initializeGameReducer(2, ['Alice', 'Bob']);
    expect(context.players[0].name).toBe('Alice');
    expect(context.players[1].name).toBe('Bob');
  });

  test('uses default player names when not provided', () => {
    const context = Logic.initializeGameReducer(2);
    expect(context.players[0].name).toBe('Player 1');
    expect(context.players[1].name).toBe('Player 2');
  });

  test('selects random first player within valid range', () => {
    const context = Logic.initializeGameReducer(3);
    expect(context.currentPlayerIndex).toBeGreaterThanOrEqual(0);
    expect(context.currentPlayerIndex).toBeLessThan(3);
  });

  test('initializes timer to 3 minutes (180000ms)', () => {
    const context = Logic.initializeGameReducer(2);
    expect(context.timerRemainingMs).toBe(180000);
  });

  test('initializes empty selected cards array', () => {
    const context = Logic.initializeGameReducer(2);
    expect(context.selectedCards).toEqual([]);
  });
});

describe('startTimerReducer', () => {
  test('updates timerStartMs without mutating context', () => {
    const originalContext = makeContext();
    const updatedContext = Logic.startTimerReducer(originalContext);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.timerStartMs).toBeGreaterThan(0);
  });

  test('preserves all other context properties', () => {
    const player1 = makePlayer([makeCard('K')], 'player-1');
    const originalContext = makeContext({
      players: [player1],
      currentPlayerIndex: 0,
      deck: [makeCard('Q')],
    });

    const updatedContext = Logic.startTimerReducer(originalContext);

    expect(updatedContext.players).toBe(originalContext.players);
    expect(updatedContext.deck).toBe(originalContext.deck);
  });
});

describe('selectCardReducer', () => {
  test('adds card to selectedCards without mutation', () => {
    const card = makeCard('J', 'hearts');
    const player = makePlayer([card], 'player-1');
    const originalContext = makeContext({
      players: [player],
      selectedCards: [],
    });

    const updatedContext = Logic.selectCardReducer(originalContext, card.id);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.selectedCards).not.toBe(originalContext.selectedCards);
    expect(updatedContext.selectedCards.length).toBe(1);
    expect(updatedContext.selectedCards[0].id).toBe(card.id);
    expect(originalContext.selectedCards.length).toBe(0); // Original unchanged
  });

  test('returns same context when card not found', () => {
    const player = makePlayer([makeCard('K')], 'player-1');
    const originalContext = makeContext({
      players: [player],
    });

    const updatedContext = Logic.selectCardReducer(originalContext, 'nonexistent-id');

    expect(updatedContext).toBe(originalContext);
  });

  test('returns same context when card already selected', () => {
    const card = makeCard('Q');
    const player = makePlayer([card]);
    const originalContext = makeContext({
      players: [player],
      selectedCards: [card],
    });

    const updatedContext = Logic.selectCardReducer(originalContext, card.id);

    expect(updatedContext).toBe(originalContext);
  });

  test('can select multiple cards', () => {
    const card1 = makeCard('7', 'hearts');
    const card2 = makeCard('7', 'spades');
    const player = makePlayer([card1, card2]);
    let context = makeContext({ players: [player] });

    context = Logic.selectCardReducer(context, card1.id);
    context = Logic.selectCardReducer(context, card2.id);

    expect(context.selectedCards.length).toBe(2);
  });
});

describe('deselectCardReducer', () => {
  test('removes card from selectedCards without mutation', () => {
    const card = makeCard('A');
    const originalContext = makeContext({
      selectedCards: [card],
    });

    const updatedContext = Logic.deselectCardReducer(originalContext, card.id);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.selectedCards).not.toBe(originalContext.selectedCards);
    expect(updatedContext.selectedCards.length).toBe(0);
    expect(originalContext.selectedCards.length).toBe(1); // Original unchanged
  });

  test('handles deselecting non-existent card', () => {
    const card = makeCard('K');
    const context = makeContext({
      selectedCards: [card],
    });

    const updatedContext = Logic.deselectCardReducer(context, 'nonexistent-id');

    expect(updatedContext.selectedCards.length).toBe(1);
  });

  test('removes only specified card from multiple selections', () => {
    const card1 = makeCard('3', 'hearts');
    const card2 = makeCard('3', 'spades');
    const card3 = makeCard('3', 'diamonds');
    const context = makeContext({
      selectedCards: [card1, card2, card3],
    });

    const updatedContext = Logic.deselectCardReducer(context, card2.id);

    expect(updatedContext.selectedCards.length).toBe(2);
    expect(updatedContext.selectedCards).toContainEqual(card1);
    expect(updatedContext.selectedCards).toContainEqual(card3);
    expect(updatedContext.selectedCards).not.toContainEqual(card2);
  });
});

describe('playSelectedCardsReducer', () => {
  test('removes selected cards from player hand without mutation', () => {
    const card1 = makeCard('8', 'hearts');
    const card2 = makeCard('8', 'spades');
    const card3 = makeCard('Q');
    const player = makePlayer([card1, card2, card3]);
    const originalContext = makeContext({
      players: [player],
      selectedCards: [card1, card2],
    });

    const updatedContext = Logic.playSelectedCardsReducer(originalContext);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.players).not.toBe(originalContext.players);
    expect(updatedContext.players[0]).not.toBe(originalContext.players[0]);
    expect(updatedContext.players[0].hand.length).toBe(1);
    expect(updatedContext.players[0].hand[0].id).toBe(card3.id);
  });

  test('adds selected cards to discard pile without mutation', () => {
    const card1 = makeCard('9', 'hearts');
    const card2 = makeCard('9', 'spades');
    const player = makePlayer([card1, card2]);
    const discardTop = makeCard('9', 'clubs');
    const originalContext = makeContext({
      players: [player],
      discardPile: [discardTop],
      selectedCards: [card1, card2],
    });

    const updatedContext = Logic.playSelectedCardsReducer(originalContext);

    expect(updatedContext.discardPile).not.toBe(originalContext.discardPile);
    expect(updatedContext.discardPile.length).toBe(3);
    expect(updatedContext.discardPile[1]).toEqual(card1);
    expect(updatedContext.discardPile[2]).toEqual(card2);
  });

  test('clears selectedCards array', () => {
    const card = makeCard('K');
    const player = makePlayer([card]);
    const context = makeContext({
      players: [player],
      selectedCards: [card],
    });

    const updatedContext = Logic.playSelectedCardsReducer(context);

    expect(updatedContext.selectedCards).toEqual([]);
  });

  test('only modifies current player hand', () => {
    const card1 = makeCard('5');
    const player1 = makePlayer([card1], 'player-1');
    const player2 = makePlayer([makeCard('K'), makeCard('Q')], 'player-2');
    const context = makeContext({
      players: [player1, player2],
      currentPlayerIndex: 0,
      selectedCards: [card1],
    });

    const updatedContext = Logic.playSelectedCardsReducer(context);

    expect(updatedContext.players[0].hand.length).toBe(0);
    expect(updatedContext.players[1].hand.length).toBe(2);
    expect(updatedContext.players[1]).toBe(context.players[1]); // Other player unchanged
  });
});

describe('autoPlaySingleCardReducer', () => {
  test('removes matching card from player hand without mutation', () => {
    const topCard = makeCard('10', 'hearts');
    const matchingCard = makeCard('10', 'spades');
    const otherCard = makeCard('A');
    const player = makePlayer([matchingCard, otherCard]);
    const originalContext = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    const updatedContext = Logic.autoPlaySingleCardReducer(originalContext);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.players[0].hand.length).toBe(1);
    expect(updatedContext.players[0].hand[0].id).toBe(otherCard.id);
  });

  test('adds matching card to discard pile', () => {
    const topCard = makeCard('4', 'hearts');
    const matchingCard = makeCard('4', 'spades');
    const player = makePlayer([matchingCard]);
    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    const updatedContext = Logic.autoPlaySingleCardReducer(context);

    expect(updatedContext.discardPile.length).toBe(2);
    expect(updatedContext.discardPile[1]).toEqual(matchingCard);
  });

  test('returns same context when no matching card found', () => {
    const topCard = makeCard('K');
    const player = makePlayer([makeCard('A'), makeCard('2')]);
    const context = makeContext({
      players: [player],
      discardPile: [topCard],
    });

    const updatedContext = Logic.autoPlaySingleCardReducer(context);

    expect(updatedContext).toBe(context);
  });

  test('only modifies current player', () => {
    const topCard = makeCard('J', 'hearts');
    const matchingCard = makeCard('J', 'spades');
    const player1 = makePlayer([matchingCard], 'player-1');
    const player2 = makePlayer([makeCard('K')], 'player-2');
    const context = makeContext({
      players: [player1, player2],
      currentPlayerIndex: 0,
      discardPile: [topCard],
    });

    const updatedContext = Logic.autoPlaySingleCardReducer(context);

    expect(updatedContext.players[0].hand.length).toBe(0);
    expect(updatedContext.players[1]).toBe(context.players[1]); // Other player unchanged
  });
});

describe('drawCardReducer', () => {
  test('adds card from deck to player hand without mutation', () => {
    const deckCard = makeCard('6');
    const player = makePlayer([makeCard('K')]);
    const originalContext = makeContext({
      players: [player],
      deck: [deckCard, makeCard('Q')],
    });

    const updatedContext = Logic.drawCardReducer(originalContext);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.players[0].hand.length).toBe(2);
    expect(updatedContext.players[0].hand[1]).toEqual(deckCard);
  });

  test('removes drawn card from deck without mutation', () => {
    const deckCard1 = makeCard('7');
    const deckCard2 = makeCard('8');
    const player = makePlayer([]);
    const originalContext = makeContext({
      players: [player],
      deck: [deckCard1, deckCard2],
    });

    const updatedContext = Logic.drawCardReducer(originalContext);

    expect(updatedContext.deck).not.toBe(originalContext.deck);
    expect(updatedContext.deck.length).toBe(1);
    expect(updatedContext.deck[0]).toEqual(deckCard2);
  });

  test('returns same context when deck is empty', () => {
    const player = makePlayer([makeCard('A')]);
    const context = makeContext({
      players: [player],
      deck: [],
    });

    const updatedContext = Logic.drawCardReducer(context);

    expect(updatedContext).toBe(context);
  });

  test('only modifies current player', () => {
    const deckCard = makeCard('2');
    const player1 = makePlayer([makeCard('K')], 'player-1');
    const player2 = makePlayer([makeCard('Q')], 'player-2');
    const context = makeContext({
      players: [player1, player2],
      currentPlayerIndex: 0,
      deck: [deckCard],
    });

    const updatedContext = Logic.drawCardReducer(context);

    expect(updatedContext.players[0].hand.length).toBe(2);
    expect(updatedContext.players[1]).toBe(context.players[1]); // Other player unchanged
  });
});

describe('advanceTurnReducer', () => {
  test('increments currentPlayerIndex without mutation', () => {
    const originalContext = makeContext({
      players: [makePlayer([], 'p1'), makePlayer([], 'p2'), makePlayer([], 'p3')],
      currentPlayerIndex: 0,
    });

    const updatedContext = Logic.advanceTurnReducer(originalContext);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.currentPlayerIndex).toBe(1);
  });

  test('wraps currentPlayerIndex back to 0', () => {
    const context = makeContext({
      players: [makePlayer([], 'p1'), makePlayer([], 'p2')],
      currentPlayerIndex: 1,
    });

    const updatedContext = Logic.advanceTurnReducer(context);

    expect(updatedContext.currentPlayerIndex).toBe(0);
  });

  test('clears selectedCards array', () => {
    const card = makeCard('K');
    const context = makeContext({
      selectedCards: [card],
      currentPlayerIndex: 0,
    });

    const updatedContext = Logic.advanceTurnReducer(context);

    expect(updatedContext.selectedCards).toEqual([]);
    expect(updatedContext.selectedCards).not.toBe(context.selectedCards);
  });
});

describe('updateTimerReducer', () => {
  test('decreases timerRemainingMs without mutation', () => {
    const startTime = performance.now();
    const originalContext = makeContext({
      timerStartMs: startTime - 5000, // 5 seconds elapsed
      timerRemainingMs: 180000,
    });

    const updatedContext = Logic.updateTimerReducer(originalContext);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.timerRemainingMs).toBeLessThan(180000);
    expect(updatedContext.timerRemainingMs).toBeGreaterThanOrEqual(0);
  });

  test('never goes below 0', () => {
    const startTime = performance.now();
    const context = makeContext({
      timerStartMs: startTime - 200000, // More than 180 seconds elapsed
      timerRemainingMs: 180000,
    });

    const updatedContext = Logic.updateTimerReducer(context);

    expect(updatedContext.timerRemainingMs).toBe(0);
  });
});

describe('calculateScoresReducer', () => {
  test('calculates scores for all players without mutation', () => {
    const player1 = makePlayer([makeCard('A'), makeCard('2')], 'player-1'); // 1 + 2 = 3
    const player2 = makePlayer([makeCard('K'), makeCard('Q')], 'player-2'); // 13 + 12 = 25
    const originalContext = makeContext({
      players: [player1, player2],
    });

    const updatedContext = Logic.calculateScoresReducer(originalContext);

    expect(updatedContext).not.toBe(originalContext);
    expect(updatedContext.roundScores['player-1']).toBe(3);
    expect(updatedContext.roundScores['player-2']).toBe(25);
  });

  test('handles empty hands (score = 0)', () => {
    const player = makePlayer([], 'player-1');
    const context = makeContext({
      players: [player],
    });

    const updatedContext = Logic.calculateScoresReducer(context);

    expect(updatedContext.roundScores['player-1']).toBe(0);
  });

  test('correctly sums card values', () => {
    const player = makePlayer(
      [makeCard('A'), makeCard('5'), makeCard('J'), makeCard('K')],
      'player-1'
    );
    // 1 + 5 + 11 + 13 = 30
    const context = makeContext({
      players: [player],
    });

    const updatedContext = Logic.calculateScoresReducer(context);

    expect(updatedContext.roundScores['player-1']).toBe(30);
  });
});
