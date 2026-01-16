import { test, expect } from 'bun:test';
import { createActor } from 'xstate';
import { cardGameMachine } from '../machines/cardGameMachine';
import type { Card, GameContext, Player, Rank, Suit } from '../lib/types';

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

function buildActor(value: any, context: Partial<GameContext>) {
  const fullContext: GameContext = {
    players: context.players ?? [makePlayer([])],
    currentPlayerIndex: context.currentPlayerIndex ?? 0,
    deck: context.deck ?? [],
    discardPile: context.discardPile ?? [],
    selectedCards: context.selectedCards ?? [],
    timerStartMs: context.timerStartMs ?? 0,
    timerRemainingMs: context.timerRemainingMs ?? 180000,
    roundScores: context.roundScores ?? {},
  };

  const snapshot = cardGameMachine.resolveState({
    value,
    context: fullContext,
  });

  return createActor(cardGameMachine, { snapshot }).start();
}

test('selecting state transitions to evaluating when selection matches top card', () => {
  const topCard = makeCard('K');
  const selection = [makeCard('K', 'hearts')];
  const player = makePlayer([selection[0], makeCard('Q')]);

  const actor = buildActor(
    { roundActive: { playerTurn: 'selecting' } },
    {
      players: [player],
      discardPile: [topCard],
      selectedCards: selection,
    }
  );

  actor.send({ type: 'card.play' });
  const next = actor.getSnapshot();
  actor.stop();
  // With delays, should be in evaluating state (waiting for EVALUATING_DELAY before checking win conditions)
  expect(next.value).toEqual({ roundActive: { playerTurn: 'evaluating' } });
  expect(next.context.players[0].hand.length).toBe(1);
});

test('invalid selection keeps machine in selecting state', () => {
  const topCard = makeCard('5');
  const selection = [makeCard('7'), makeCard('7', 'spades')];
  const player = makePlayer([...selection, makeCard('5', 'clubs')]);

  const actor = buildActor(
    { roundActive: { playerTurn: 'selecting' } },
    {
      players: [player],
      discardPile: [topCard],
      selectedCards: selection,
    }
  );

  actor.send({ type: 'card.play' });
  const next = actor.getSnapshot();
  actor.stop();
  expect(next.value).toEqual({ roundActive: { playerTurn: 'selecting' } });
});

test('card.select adds card to selection when available', () => {
  const card = makeCard('J');
  const player = makePlayer([card]);
  const actor = buildActor(
    { roundActive: { playerTurn: 'selecting' } },
    {
      players: [player],
      selectedCards: [],
    }
  );

  actor.send({ type: 'card.select', cardId: card.id });
  const next = actor.getSnapshot();
  actor.stop();
  expect(next.context.selectedCards.length).toBe(1);
  expect(next.context.selectedCards[0].id).toBe(card.id);
});

test('card.deselect removes card from selection', () => {
  const card = makeCard('9');
  const actor = buildActor(
    { roundActive: { playerTurn: 'selecting' } },
    {
      players: [makePlayer([card])],
      selectedCards: [card],
    }
  );

  actor.send({ type: 'card.deselect', cardId: card.id });
  const next = actor.getSnapshot();
  actor.stop();
  expect(next.context.selectedCards.length).toBe(0);
});

// ============================================================================
// State Transition Tests (Event-Driven)
// ============================================================================
// NOTE: Tests for `always` transitions (automatic routing) will be added in
// Phase 2 when we implement timing delays. Currently, `always` transitions
// fire synchronously and intermediate states aren't observable when using
// resolveState to create snapshots. These tests focus on event-driven
// transitions that we can reliably observe.

test('idle transitions to roundActive on game.start event', () => {
  const actor = createActor(cardGameMachine).start();

  expect(actor.getSnapshot().value).toBe('idle');

  actor.send({ type: 'game.start', playerCount: 2 });

  const snapshot = actor.getSnapshot();
  actor.stop();

  // After game.start, should transition through setup to roundActive
  expect(snapshot.matches('roundActive')).toBe(true);
  // Players should be initialized
  expect(snapshot.context.players.length).toBe(2);
  // Deck should be dealt
  expect(snapshot.context.deck.length).toBeGreaterThan(0);
});

test('selecting state waits for valid card.play before transitioning', () => {
  const topCard = makeCard('3', 'hearts');
  const match1 = makeCard('3', 'spades');
  const match2 = makeCard('3', 'diamonds');
  const player = makePlayer([match1, match2, makeCard('A')]);

  const actor = buildActor(
    { roundActive: { playerTurn: 'selecting' } },
    {
      players: [player],
      discardPile: [topCard],
      selectedCards: [],
    }
  );

  // Select cards
  actor.send({ type: 'card.select', cardId: match1.id });
  actor.send({ type: 'card.select', cardId: match2.id });

  let snapshot = actor.getSnapshot();
  expect(snapshot.matches({ roundActive: { playerTurn: 'selecting' } })).toBe(true);

  // Play selected cards
  actor.send({ type: 'card.play' });

  snapshot = actor.getSnapshot();
  actor.stop();

  // Should transition out of selecting after valid play
  // (May be in evaluating or changingTurn depending on always transitions)
  expect(snapshot.matches({ roundActive: { playerTurn: 'selecting' } })).toBe(false);
  // Cards should be played to discard
  expect(snapshot.context.discardPile.length).toBe(3);
});
