import { setup, assign, fromCallback, raise } from "xstate";
import type { GameContext, GameEvent } from "@/lib/types";
import * as Logic from "./cardGameLogic";
import { GAME_TIMING } from "@/lib/constants";

// Timer actor using fromCallback
const timerLogic = fromCallback(({ sendBack }) => {
  const interval = setInterval(() => {
    sendBack({ type: "timer.tick" });
  }, 1000); // Tick every second

  return () => clearInterval(interval);
});

type InternalEvent =
  | { type: "ROUND_END" }
  | { type: "AUTO_PLAY" }
  | { type: "SELECTING_REQUIRED" }
  | { type: "DRAW_REQUIRED" }
  | { type: "timing.update"; timing: GameContext['timing'] };

export const cardGameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent | InternalEvent,
  },
  actors: {
    timer: timerLogic,
  },
  actions: {
    // Setup actions - delegating to pure functions from cardGameLogic.ts
    initializeGame: assign(({ event, context }) => {
      if (event.type !== "game.start") {
        throw new Error("initializeGame called with wrong event type");
      }
      return Logic.initializeGameReducer(event.playerCount, event.playerNames, context.timing);
    }),

    startTimer: assign(({ context }) => Logic.startTimerReducer(context)),

    // Decision action - raises internal event based on game state
    decideNextAction: raise(({ context }) => ({
      type: Logic.determineNextAction(context),
    })),

    // Card actions - delegating to pure functions from cardGameLogic.ts
    selectCard: assign(({ context, event }) => {
      if (event.type !== "card.select") return context;
      return Logic.selectCardReducer(context, event.cardId);
    }),

    deselectCard: assign(({ context, event }) => {
      if (event.type !== "card.deselect") return context;
      return Logic.deselectCardReducer(context, event.cardId);
    }),

    playSelectedCards: assign(({ context }) =>
      Logic.playSelectedCardsReducer(context)
    ),

    autoPlaySingleCard: assign(({ context }) =>
      Logic.autoPlaySingleCardReducer(context)
    ),

    drawCard: assign(({ context }) => Logic.drawCardReducer(context)),

    advanceTurn: assign(({ context }) => Logic.advanceTurnReducer(context)),

    updateTimer: assign(({ context, event }) => {
      if (event.type !== "timer.tick") return context;
      return Logic.updateTimerReducer(context);
    }),

    calculateScores: assign(({ context }) =>
      Logic.calculateScoresReducer(context)
    ),

    updateTimingConfig: assign(({ event }) => {
      if (event.type !== "timing.update") return {};
      return { timing: event.timing };
    }),
  },

  delays: {
    checkingDelay: ({ context }) => context.timing.CHECKING_DELAY,
    drawDelay: ({ context }) => context.timing.DRAW_DELAY,
    evaluatingDelay: ({ context }) => context.timing.EVALUATING_DELAY,
    turnChangeDelay: ({ context }) => context.timing.TURN_CHANGE_DELAY,
  },

  guards: {
    // Card validation guards - delegating to pure functions from cardGameLogic.ts
    canPlaySelectedCards: ({ context }) => Logic.canPlaySelectedCards(context),

    // Win condition guards - delegating to pure functions from cardGameLogic.ts
    currentPlayerHasNoCards: ({ context }) =>
      Logic.currentPlayerHasNoCards(context),
    timerExpired: ({ context }) => Logic.timerExpired(context),
  },
}).createMachine({
  id: "cardGame",
  initial: "idle",
  context: {
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    discardPile: [],
    selectedCards: [],
    timerStartMs: 0,
    timerRemainingMs: GAME_TIMING.ROUND_DURATION_MS,
    roundScores: {},
    timing: {
      CHECKING_DELAY: GAME_TIMING.CHECKING_DELAY,
      DRAW_DELAY: GAME_TIMING.DRAW_DELAY,
      EVALUATING_DELAY: GAME_TIMING.EVALUATING_DELAY,
      TURN_CHANGE_DELAY: GAME_TIMING.TURN_CHANGE_DELAY,
      ROUND_DURATION_MS: GAME_TIMING.ROUND_DURATION_MS,
    },
  },
  on: {
    "timing.update": {
      actions: "updateTimingConfig",
    },
  },
  states: {
    idle: {
      on: {
        "game.start": {
          target: "roundActive",
          actions: ["initializeGame", "startTimer"],
        },
      },
    },

    roundActive: {
      invoke: {
        src: "timer",
      },
      on: {
        "timer.tick": {
          actions: "updateTimer",
        },
      },
      always: {
        guard: "timerExpired",
        target: "roundEnd",
      },
      initial: "playerTurn",
      states: {
        playerTurn: {
          initial: "checkingCards",
          states: {
            checkingCards: {
              after: {
                checkingDelay: "readyToAct",
              },
            },

            readyToAct: {
              entry: "decideNextAction",
              on: {
                ROUND_END: {
                  target: "#cardGame.roundEnd",
                },
                AUTO_PLAY: {
                  target: "evaluating",
                  actions: "autoPlaySingleCard",
                },
                SELECTING_REQUIRED: {
                  target: "selecting",
                },
                DRAW_REQUIRED: {
                  target: "drawing",
                },
              },
            },

            selecting: {
              on: {
                "card.select": {
                  actions: "selectCard",
                },
                "card.deselect": {
                  actions: "deselectCard",
                },
                "card.play": {
                  guard: "canPlaySelectedCards",
                  target: "evaluating",
                  actions: "playSelectedCards",
                },
              },
            },

            drawing: {
              entry: "drawCard",
              after: {
                drawDelay: "evaluating",
              },
            },

            evaluating: {
              after: {
                evaluatingDelay: [
                  {
                    guard: "currentPlayerHasNoCards",
                    target: "#cardGame.roundEnd",
                  },
                  {
                    target: "changingTurn",
                  },
                ],
              },
            },

            changingTurn: {
              entry: "advanceTurn",
              after: {
                turnChangeDelay: "checkingCards",
              },
            },
          },
        },
      },
    },

    roundEnd: {
      entry: "calculateScores",
      on: {
        "game.start": {
          target: "roundActive",
          actions: ["initializeGame", "startTimer"],
        },
      },
    },
  },
});
