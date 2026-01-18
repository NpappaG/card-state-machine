import { setup, assign, fromCallback, raise } from "xstate";
import type { GameContext, GameEvent } from "@/lib/types";
import * as Logic from "./cardGameLogic";
import { GAME_TIMING } from "@/lib/constants";

// Timer actor using fromCallback - got this idea from Xstate examples
const timerLogic = fromCallback(({ sendBack }) => {
  const interval = setInterval(() => {
    sendBack({ type: "timer.tick", timestamp: performance.now() });
  }, 1000); // Tick every second

  return () => clearInterval(interval);
});

type InternalEvent =
  | { type: "ROUND_END" }
  | { type: "AUTO_PLAY" }
  | { type: "SELECTING_REQUIRED" }
  | { type: "DRAW_REQUIRED" }
  | { type: "timing.update"; timing: GameContext['timing'] };

const startGameTransition = {
  target: "roundActive",
  actions: ["initializeGame", "startTimer"],
} as const;

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
      return Logic.updateTimerReducer(context, event.timestamp);
    }),

    pauseTimer: assign(({ context, event }) => {
      if (event.type !== "round.pause") return context;
      return Logic.pauseTimerReducer(context, performance.now());
    }),

    resumeTimer: assign(({ context, event }) => {
      if (event.type !== "round.resume") return context;
      return Logic.resumeTimerReducer(context, performance.now());
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
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAnCBxVBbMAxAC4CWuJAdlAHQCuADhKkWANoAMAuoqPQPawSpPhR4gAHonYAaEAE8pAX0Wy0mHPmro+tChACCyUgDdCpfOmqlkAaw7ckIfoOGjHkhDPlKVINdjwwLR09QxNCezFnIRIRMQ8vBU9lVQwAzW1dAyMSU2p6ABtUOTB0ABVadApqZAALMFtKKABhNNgCcVgiZiDUADMWdAAKOoabJoARMCK5AEoCfw0gzNCcvMLi0oqqmvrGqlbMWEjHaNd4xABGagBWG4BmABYANnuATnvLt8fHm4Amdg3WRJAC07Gofxuvze7D+AA57nCXpdHpdnik-GklsEsmFckENiVypVqugwKgIHIynwwgQAEoAeQAqgA5CYAfQAomyTrwBDE4u4pMCfKl1IEcatwvkZlsSVpyZTqbT9Eyygz2QAFAAy+gAmrynPzzkKENc7k9Xh8vj9-oCRQgwRCoTcYfDEcjUejfIsJStstLCXKdmSKVSaUYCABlTnaznNMoASRZWHZdM5AEUmYn0xNDWdYm5QB5zQ8Xu9Pt9fgCgd5HeDIdDYQikc8UWiMb6MiEA-iZZtiSHFeHaRM6foAOppzPZ3P542Fi5m25lq2V201h1Oxuu5setteztYv09vHrWWD6qwaYNUhUBZpajXgq3+cuRem0uWis26v2uvbi6botp6HY+se3a4msBIXtsV43jk97+NQEBwAhRBvgKRYSFcK7ftaVZ2rWoINkBe6tu23piukyyntB-ZEnBT7oU0D6YAxmEmsWVxvH81BvM87BtuwbxwsJcJiQ6lxCfc1ASQA7H8yKQs8byXDcR7ipBUp9kGl4oegqAAO6sZ03QsNQ-SDEMECGUZUwzPMXa0VBgawfKtnGU0nEftxy4WuWBEbv+JHOk27oUYe4FaS5OnngOTFgMYqAFLQzCmV0PSWQMpRDElKVpXeUAOcUTkQbFvbxYx8r5al6VUD5gp+YkoqYjFkqVTBCU1cldVFR0mUWVZuW1YVkzTKVbE0R1Z5ddVOyjfVUCsJcDh8u+TU4Wa8lvNQ9z3H8fzSfc7A-H8Dp-Cde13Jc8k3Jcnxwg9p2adN-qzQxwbVHUqBUE0cEDeZvQ5cMRAks0tS-TAJVzFN2LvfRelMT9f1UHBjXYR4N1yadCLVpch0iVJby7bxzyQuw7BifJ7D3N6vgUHwqHwI4zlRAum0eCCKKPFunzgr8LxU1Crz3Dtr3YteYP0OzG2Y4gIIvNQzyPPJ8lon8qmIvJYu8wBvxyTczwSRTUI8-cEsnq5+Ky1hS4gt81A-M8DyCcbgJQnCW6HXxasCepin+98GnRW9dFud1VS21xW2K88TsvK7Qlwh7jxewBcLyfxfxvK6OuvI8h1wm8lvaZ1n36aM+wtG00e+VtfyKXtOuIgCaffCrDqFzc-GugiB6qY3fylxVH1I-KoZKhGRB15ziBp3xPyws88mZ43uMOq6PcHepNzyeT8mqwTI8zYj7k7M+t5NLP8sIE8PcokbMKXGJ7Av3rSRq481Dvy88LFzTY2J8EYR3mtUTyJkqA3yXJaJ2JNBJIhhDcBEe8HS8R7rTe6+9M7-ChI8YB4ddLn2qItIq0DTRHT4kdZ6iJPg60eLTKSdNv5vzuncXiqIjoEOtlVL6uwob-RJOQvyj05KrwYbxVeSk3hSRflnD4h0X5PSplTbhehOR6GEbHASUlVbf0Ph6LegJi4h2UEAA */
  id: "cardGame",
  initial: "setup",
  context: {
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    discardPile: [],
    selectedCards: [],
    timerStartMs: 0,
    timerRemainingMs: GAME_TIMING.ROUND_DURATION_MS,
    pausedAt: null,
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
    setup: {
      on: {
        "game.start": startGameTransition,
      },
    },

    roundActive: {
      initial: "playing",
      always: {
        guard: "timerExpired",
        target: "roundEnd",
      },
      states: {
        playing: {
          invoke: {
            src: "timer",
          },
          on: {
            "timer.tick": {
              actions: "updateTimer",
            },
            "round.pause": {
              target: "#cardGame.roundActive.paused",
              actions: "pauseTimer",
            },
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
                      actions: "drawCard",
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
                        actions: "advanceTurn",
                      },
                    ],
                  },
                },

                changingTurn: {
                  after: {
                    turnChangeDelay: "checkingCards",
                  },
                },
              },
            },
            hist: {
              type: "history",
              history: "deep",
            },
          },
        },
        paused: {
          on: {
            "round.resume": {
              target: "#cardGame.roundActive.playing.hist",
              actions: "resumeTimer",
            },
          },
        },
      },
    },

    roundEnd: {
      entry: "calculateScores",
      on: {
        "game.start": startGameTransition,
      },
    },
  },
});
