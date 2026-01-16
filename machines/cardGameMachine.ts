import { setup, assign, fromCallback } from 'xstate';
import type { GameContext, GameEvent, Card, Player, Suit, Rank } from '@/lib/types';

// Helper: Create a standard 52-card deck
function createDeck(): Card[] {
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

// Helper: Shuffle array in place (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper: Get random integer between 0 and max (exclusive)
function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// Timer actor using fromCallback
const timerLogic = fromCallback(({ sendBack }) => {
  const interval = setInterval(() => {
    sendBack({ type: 'timer.tick' });
  }, 1000); // Tick every second

  return () => clearInterval(interval);
});

export const cardGameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  actors: {
    timer: timerLogic,
  },
  actions: {
    // Setup actions
    initializeGame: assign(({ context, event }) => {
      if (event.type !== 'game.start') return context;

      const playerCount = Math.max(2, Math.min(4, event.playerCount));

      // Create and shuffle deck
      const shuffledDeck = shuffle(createDeck());

      // Deal 5 cards to each player (pure - no mutation)
      const players: Player[] = Array.from({ length: playerCount }, (_, i) => {
        const startIdx = i * 5;
        return {
          id: `player-${i + 1}`,
          name: event.playerNames?.[i] || `Player ${i + 1}`,
          hand: shuffledDeck.slice(startIdx, startIdx + 5),
          score: 0,
        };
      });

      // Calculate remaining deck position
      const deckStartIdx = playerCount * 5;

      // Deal one card to discard pile
      const discardPile = [shuffledDeck[deckStartIdx]];

      // Remaining deck
      const deck = shuffledDeck.slice(deckStartIdx + 1);

      // Select random first player
      const currentPlayerIndex = randomInt(playerCount);

      return {
        players,
        currentPlayerIndex,
        deck,
        discardPile,
        selectedCards: [],
        timerStartMs: performance.now(),
        timerRemainingMs: 180000, // 3 minutes
        roundScores: Object.fromEntries(players.map((p) => [p.id, 0])),
      };
    }),

    startTimer: assign({
      timerStartMs: () => performance.now(),
    }),

    // Card actions
    selectCard: assign(({ context, event }) => {
      if (event.type !== 'card.select') return context;

      const currentPlayer = context.players[context.currentPlayerIndex];
      const card = currentPlayer.hand.find((c) => c.id === event.cardId);

      if (!card || context.selectedCards.some((c) => c.id === card.id)) {
        return context;
      }

      return {
        ...context,
        selectedCards: [...context.selectedCards, card],
      };
    }),

    deselectCard: assign(({ context, event }) => {
      if (event.type !== 'card.deselect') return context;

      return {
        ...context,
        selectedCards: context.selectedCards.filter((c) => c.id !== event.cardId),
      };
    }),

    playSelectedCards: assign(({ context }) => {
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
    }),

    autoPlaySingleCard: assign(({ context }) => {
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
    }),

    drawCard: assign(({ context }) => {
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
    }),

    advanceTurn: assign(({ context }) => ({
      ...context,
      currentPlayerIndex: (context.currentPlayerIndex + 1) % context.players.length,
      selectedCards: [],
    })),

    updateTimer: assign(({ context, event }) => {
      if (event.type !== 'timer.tick') return context;

      const elapsed = performance.now() - context.timerStartMs;
      const remaining = Math.max(0, 180000 - elapsed);

      return {
        ...context,
        timerRemainingMs: remaining,
      };
    }),

    calculateScores: assign(({ context }) => {
      const roundScores: Record<string, number> = {};

      context.players.forEach((player) => {
        const score = player.hand.reduce((sum, card) => sum + card.value, 0);
        roundScores[player.id] = score;
      });

      return {
        ...context,
        roundScores,
      };
    }),
  },

  guards: {
    // Card validation guards
    canPlaySelectedCards: ({ context }) => {
      if (context.selectedCards.length === 0) return false;

      const topCard = context.discardPile[context.discardPile.length - 1];
      return context.selectedCards.every((card) => card.rank === topCard.rank);
    },

    hasMultipleValidCards: ({ context }) => {
      const currentPlayer = context.players[context.currentPlayerIndex];
      const topCard = context.discardPile[context.discardPile.length - 1];

      const validCards = currentPlayer.hand.filter((card) => card.rank === topCard.rank);
      return validCards.length > 1;
    },

    hasSingleValidCard: ({ context }) => {
      const currentPlayer = context.players[context.currentPlayerIndex];
      const topCard = context.discardPile[context.discardPile.length - 1];

      const validCards = currentPlayer.hand.filter((card) => card.rank === topCard.rank);
      return validCards.length === 1;
    },

    // Win condition guards
    currentPlayerHasNoCards: ({ context }) => {
      const currentPlayer = context.players[context.currentPlayerIndex];
      return currentPlayer.hand.length === 0;
    },

    timerExpired: ({ context }) => {
      return context.timerRemainingMs <= 0;
    },

    deckEmpty: ({ context }) => {
      return context.deck.length === 0;
    },
  },
}).createMachine({
  id: 'cardGame',
  initial: 'idle',
  context: {
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    discardPile: [],
    selectedCards: [],
    timerStartMs: 0,
    timerRemainingMs: 180000,
    roundScores: {},
  },
  states: {
    idle: {
      on: {
        'game.start': {
          target: 'setup',
          actions: 'initializeGame',
        },
      },
    },

    setup: {
      entry: 'startTimer',
      always: {
        target: 'roundActive',
      },
    },

    roundActive: {
      invoke: {
        src: 'timer',
      },
      on: {
        'timer.tick': {
          actions: 'updateTimer',
        },
      },
      always: {
        guard: 'timerExpired',
        target: 'roundEnd',
      },
      initial: 'playerTurn',
      states: {
        playerTurn: {
          initial: 'checkingCards',
          states: {
            checkingCards: {
              always: [
                {
                  guard: 'currentPlayerHasNoCards',
                  target: '#cardGame.roundEnd',
                },
                {
                  guard: 'hasMultipleValidCards',
                  target: 'selecting',
                },
                {
                  guard: 'hasSingleValidCard',
                  target: 'evaluating',
                  actions: 'autoPlaySingleCard',
                },
                {
                  // No valid cards - must draw
                  target: 'drawing',
                },
              ],
            },

            selecting: {
              on: {
                'card.select': {
                  actions: 'selectCard',
                },
                'card.deselect': {
                  actions: 'deselectCard',
                },
                'card.play': {
                  guard: 'canPlaySelectedCards',
                  target: 'evaluating',
                  actions: 'playSelectedCards',
                },
              },
            },

            drawing: {
              entry: 'drawCard',
              always: {
                target: 'evaluating',
              },
            },

            evaluating: {
              always: [
                {
                  guard: 'currentPlayerHasNoCards',
                  target: '#cardGame.roundEnd',
                },
                {
                  target: 'changingTurn',
                },
              ],
            },

            changingTurn: {
              entry: 'advanceTurn',
              after: {
                500: 'checkingCards', // 500ms delay for animation
              },
            },
          },
        },
      },
    },

    roundEnd: {
      entry: 'calculateScores',
      type: 'final',
    },
  },
});
