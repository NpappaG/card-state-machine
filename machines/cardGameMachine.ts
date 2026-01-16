import { setup, assign, fromCallback } from 'xstate';
import type { GameContext, GameEvent } from '@/lib/types';
import * as Logic from './cardGameLogic';
import { GAME_TIMING } from '@/lib/constants';

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
    // Setup actions - delegating to pure functions from cardGameLogic.ts
    initializeGame: assign(({ event }) => {
      if (event.type !== 'game.start') {
        throw new Error('initializeGame called with wrong event type');
      }
      return Logic.initializeGameReducer(event.playerCount, event.playerNames);
    }),

    startTimer: assign(({ context }) => Logic.startTimerReducer(context)),

    // Card actions - delegating to pure functions from cardGameLogic.ts
    selectCard: assign(({ context, event }) => {
      if (event.type !== 'card.select') return context;
      return Logic.selectCardReducer(context, event.cardId);
    }),

    deselectCard: assign(({ context, event }) => {
      if (event.type !== 'card.deselect') return context;
      return Logic.deselectCardReducer(context, event.cardId);
    }),

    playSelectedCards: assign(({ context }) => Logic.playSelectedCardsReducer(context)),

    autoPlaySingleCard: assign(({ context }) => Logic.autoPlaySingleCardReducer(context)),

    drawCard: assign(({ context }) => Logic.drawCardReducer(context)),

    advanceTurn: assign(({ context }) => Logic.advanceTurnReducer(context)),

    updateTimer: assign(({ context, event }) => {
      if (event.type !== 'timer.tick') return context;
      return Logic.updateTimerReducer(context);
    }),

    calculateScores: assign(({ context }) => Logic.calculateScoresReducer(context)),
  },

  guards: {
    // Card validation guards - delegating to pure functions from cardGameLogic.ts
    canPlaySelectedCards: ({ context }) => Logic.canPlaySelectedCards(context),
    hasMultipleValidCards: ({ context }) => Logic.hasMultipleValidCards(context),
    hasSingleValidCard: ({ context }) => Logic.hasSingleValidCard(context),

    // Win condition guards - delegating to pure functions from cardGameLogic.ts
    currentPlayerHasNoCards: ({ context }) => Logic.currentPlayerHasNoCards(context),
    timerExpired: ({ context }) => Logic.timerExpired(context),
    deckEmpty: ({ context }) => Logic.deckEmpty(context),
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
    timerRemainingMs: GAME_TIMING.ROUND_DURATION_MS,
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
              after: {
                [GAME_TIMING.CHECKING_DELAY]: {
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
              },
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
              after: {
                [GAME_TIMING.DRAW_DELAY]: {
                  always: {
                    target: 'evaluating',
                  },
                },
              },
            },

            evaluating: {
              after: {
                [GAME_TIMING.EVALUATING_DELAY]: {
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
              },
            },

            changingTurn: {
              entry: 'advanceTurn',
              after: {
                [GAME_TIMING.TURN_CHANGE_DELAY]: 'checkingCards',
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
