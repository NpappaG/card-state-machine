import { setup, assign, sendTo } from "xstate";
import type { GameContext, GameEvent } from "@/lib/types";
import * as Logic from "@/lib/cardGameLogic";
import { GAME_TIMING } from "@/lib/constants";
import { timerMachine } from "./timerMachine";

const TIMER_TICK_MS = 1000;

const getRoundStartMs = (
  event: GameEvent | undefined
): number => {
  if (event && (event.type === "game.start" || event.type === "round.start")) {
    return event.timestamp;
  }
  return performance.now();
};

export const cardGameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  actors: {
    timer: timerMachine,
  },
  actions: {
    // Setup actions - delegating to pure functions from lib/cardGameLogic.ts
    initializeGame: assign(({ event, context }) => {
      // Machine structure guarantees this is only called on game.start
      const startEvent = event as Extract<GameEvent, { type: "game.start" }>;
      return Logic.initializeGameReducer(
        startEvent.playerCount,
        startEvent.playerNames,
        context.timing
      );
    }),
    restartRound: assign(({ context }) => {
      const playerNames = context.players.map((player) => player.name);
      const playerCount = playerNames.length || 2;
      return Logic.initializeGameReducer(
        playerCount,
        playerNames,
        context.timing
      );
    }),
    resetGame: assign(({ context }) => Logic.resetGameReducer(context)),

    // Card actions - delegating to pure functions from lib/cardGameLogic.ts
    selectCard: assign(({ context, event }) => {
      // Machine structure guarantees this is only called on card.select
      const selectEvent = event as Extract<GameEvent, { type: "card.select" }>;
      return Logic.selectCardReducer(context, selectEvent.cardId);
    }),

    deselectCard: assign(({ context, event }) => {
      // Machine structure guarantees this is only called on card.deselect
      const deselectEvent = event as Extract<GameEvent, { type: "card.deselect" }>;
      return Logic.deselectCardReducer(context, deselectEvent.cardId);
    }),

    playSelectedCards: assign(({ context }) =>
      Logic.playSelectedCardsReducer(context)
    ),

    autoPlaySingleCard: assign(({ context }) =>
      Logic.autoPlaySingleCardReducer(context)
    ),

    drawCard: assign(({ context }) => Logic.drawCardReducer(context)),

    advanceTurn: assign(({ context }) => Logic.advanceTurnReducer(context)),

    forwardPauseToTimer: sendTo("timer", ({ event }) => {
      const pauseEvent = event as Extract<GameEvent, { type: "round.pause" }>;
      return { type: "timer.pause", timestamp: pauseEvent.timestamp };
    }),

    forwardResumeToTimer: sendTo("timer", ({ event }) => {
      const resumeEvent = event as Extract<GameEvent, { type: "round.resume" }>;
      return { type: "timer.resume", timestamp: resumeEvent.timestamp };
    }),

    calculateScores: assign(({ context }) =>
      Logic.calculateScoresReducer(context)
    ),

    updateTimingConfig: assign(({ event }) => {
      // Machine structure guarantees this is only called on timing.update
      const updateEvent = event as Extract<GameEvent, { type: "timing.update" }>;
      return { timing: updateEvent.timing };
    }),
  },

  delays: {
    // this uses the Dynamic delays, defines them as a function returning delay time in ms
    checkingDelay: ({ context }) => context.timing.CHECKING_DELAY,
    autoPlayDelay: ({ context }) => context.timing.AUTO_PLAY_DELAY,
    drawDelay: ({ context }) => context.timing.DRAW_DELAY,
    evaluatingDelay: ({ context }) => context.timing.EVALUATING_DELAY,
    turnChangeDelay: ({ context }) => context.timing.TURN_CHANGE_DELAY,
  },

  guards: {
    // Card validation + win validation guards - delegating to pure functions from lib/cardGameLogic.ts
    canPlaySelectedCards: ({ context }) => Logic.canPlaySelectedCards(context),
    currentPlayerHasNoCards: ({ context }) =>
      Logic.currentPlayerHasNoCards(context),
    hasMultipleValidCards: ({ context }) =>
      Logic.hasMultipleValidCards(context),
    hasSingleValidCard: ({ context }) => Logic.hasSingleValidCard(context),
    deckEmpty: ({ context }) => Logic.deckEmpty(context),
    isStalemate: ({ context }) => Logic.isStalemate(context),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAnCBxVBbMAxAC4CWuJAdlAHQCuADhKkWANoAMAuoqPQPawSpPhR4gAHogCMAZgBsADmoz57dgE4ALGs1SATJoA0IAJ7S9AXwvG0mHPmqwwRBgSh4wjohiIduSEH5BYVEAyQR1dmVIuXUFKQVNLT0ZAFZjMwQ9VLlqPQVUvQB2TRzEvSkpKxsMbA9qdD5aCggAQWRSADdCUnx0ajBxehJ0SD8xIKESETFwvVii6lSE9XyShT0DDMREmWp2IqlD+U1i+JlqkFs6h0bmto6Sbup6ABtUE0ooAjuWl9RaE5xgFJiFZtJ1EUlAcjuxCutskVtgginJUnkijJ2BsFBoUiVLtd7J5fg8up43h8vi93iYwOgACq0dAUajIAAWYGQAGsvgBhWqwAjiWDeFjUVAAMxY6AAFByubyqAARMC0gCUBCJ9VJ7XJNKpVANdMZzNZCp5-MFwN4AimMzCiHk6M0MkOWmW6jkRShcmRChK1CKqQ27BkBS0lSq1iutWJDSaLT1TwptOplJNTJZbM5lqoAswQpFYs8Upl8tzSqgqo1WrjOsTZJTxvTtPpWfNlathdYUn8tuC01CoHCMk0miW8TkpRxOXYftMiHUMnU1FiM7DWLirsJ9dujeTzwzrY+7bNOcV3YgRdFzFL0vpFcvKrVH012v390PqcNNAzZ+zC0qwLa9WD0ftAjtMFHSyH1qCkdRIm0BJ2F0AMF0yWQKmoL0CmxNREIQi4Yw-EkD0eI80yNf9TUArt80FYVb3FMtHyAr4azfOs7AbL8KJ-T5qLbWjO2fKAQNgVgZAg0Eh3BBAZEqfZUNxV1Ck0ANkSkVI3TXVJsRKTEpG0TZdx4z8k34lshNPESLzzcTGOLO8JQfOV2JfWtSITPj9WPGzM3PDzHJ7TQZKguSYNSLQcPQop1H0VZUiRRcEGM9gpHgnSAxkfI5G05KzJuMjfObfy-2EjsJVoIg+AABSo75nJYtzZQBWqGo+TiTHfPcSssvzGuNADWXa+rGptSDBwdEdpFQvZYjkAxThXaKEi0vRImobQFCnN09GxLQivjXUrPK4a7KcV4uVIKhuIgRw1RuybZJmiREB9TLdviVJXXmdhsnULSw1yTdUmShRvS9JJjt4gayqGmiqqum6vnu6gIDgJ6OheiK3vCVE9CDKQlviwj50UZEtCifDw2xcHFA02GLKbSjfwu5Hsdu75rmNXHpuHd6EDkNEg1xLFEkhYMcg2sM8l29R9KSLFsWImpzP61mBJPQLswgdBUAAdzR5r73LfWje63qNZ8+G2cEirbKqi3jaofn7UF8J9E2JYjkUSENBKPQtNdXJ8txRWDAByHUmZzXv2sx3ddZMBOlQV5aGYE3mLNx9U-TzPuat+6TvIwb2aR8984zrO3a4CY8c96RkJwg54s26XKhkKnNFyYoEtdKEcnDBQ49trXE45qu05r7mmJLVzy2rwuONfHqS7hifzsr7Nl9rqBe3CgX5MSxYlZUBCDGMlLMIQpRwcUkWEKKVWx9O8uHanujUCoL4O3nlyrE5QuBZHydkP8YDF28u-BGFdKpBXAb-KgHZ3bQVmmlJ+yglqVFiNpVEQNUok1KEsOIUIUiJEUPFN+ZcyoAicBAH4jYGhwFoPgVBkV0GyExNtU4BwvSfSkMiRQUQIzhlOJicGANqH3AAKItEYfcLwPh2H40QHIDQ8F1GFEUJUbQlNUqKXviLbI+lUSYhUNIlociGHuAcHwbo6AVFNwQMlZEB0Axrg0oDX6uIfSx0uBQPgmN4ABFIg3Y+MEAC0+glAlD9gcFI44ijFGRFCeCANQ6lF+hUQ4Y8nAuHoOEj28lIm4iDLoVECSxyaGSQQzCot1EGDdPOccmxlyWK1kUtBQtwz7AUCoAZgyVBGFSr3UGY5GZaMhhpIoHSE7lS6RwoWkM+lDLWSMzIS1VzhjWMhTYAY5lnURvAlkizVFpTHKstZgyNkfTgnEBQiFoq+gQuoQ5H8dYjXssBQUZznEJCJqra5AzbkIBjttR5ag5C5U2psaM6tirj3mccp254xqdQdn8+ScSsFLRFiGXKGxQVYSiL3SGlRMT4nkO82Bn8d6shRo8KgWKYJQkytHYMGwRZqHnFpWQuQ4jejHLtDJhQaX20+XZF2XwWWcIOOiZJboJaQm0DLQhpxVzJTHIDRSqxvTiu1gFL5e9uayqFpULaaQ0SKGissKEN8lzjiDPFBIOyNDaoNZPelOYIF-zNGar204iYFAqBofKGk4TB0IfIJQqxtAlAysuUyJE+pIqOezdkJBRQBukIUVJJNqC7XyKUXQ2UxUpptjAo8dDIA5qyPoPuih8VhsBhhNRaglhjhfhfZY041axkrY2axdaUibTyOosm0sDiQypvOEh0UVz9KWtkKwVggA */
  id: "cardGame",
  initial: "setup",
  context: {
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    discardPile: [],
    selectedCards: [],
    roundScores: {},
    timing: {
      CHECKING_DELAY: GAME_TIMING.CHECKING_DELAY,
      AUTO_PLAY_DELAY: GAME_TIMING.AUTO_PLAY_DELAY,
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
        "game.start": {
          target: "roundActive",
          actions: "initializeGame",
        },
      },
    },

    roundActive: {
      initial: "playing",
      invoke: {
        id: "timer",
        src: "timer",
        syncSnapshot: true,
        input: ({ context, event, self }) => ({
          durationMs: context.timing.ROUND_DURATION_MS,
          startMs: getRoundStartMs(event),
          tickIntervalMs: TIMER_TICK_MS,
          parentRef: self,
        }),
      },
      on: {
        "timer.expired": {
          target: "roundEnd",
        },
      },
      states: {
        playing: {
          on: {
            "round.pause": {
              target: "#cardGame.roundActive.paused",
              actions: "forwardPauseToTimer",
            },
          },
          initial: "playerTurn",
          states: {
            playerTurn: {
              initial: "checkingCards",
              states: {
                checkingCards: {
                  // Fast decision logic - routes to appropriate state
                  // Order is critical - defensive ordering checks complex cases first:
                  //
                  // 1. Stalemate (deck empty, no one can play) → end round
                  // 2. Multiple matches → player chooses (prevents auto-play when player should decide)
                  // 3. Single match → auto-play with animation
                  // 4. Deck exhausted but someone might match → skip turn
                  // 5. Default → draw card
                  //
                  // Rationale: Check stalemate first to prevent infinite loops.
                  // Check multiple before single to prevent bugs where we
                  // auto-play when player should have choice. Defensive ordering.
                  after: {
                    checkingDelay: [
                      // 1. Stalemate - deck empty and no player can play
                      {
                        guard: "isStalemate",
                        target: "#cardGame.roundEnd",
                      },
                      // 2. Player has choices (let them decide)
                      {
                        guard: "hasMultipleValidCards",
                        target: "selecting",
                      },
                      // 3. Auto-play single card with animation
                      {
                        guard: "hasSingleValidCard",
                        target: "autoPlaying",
                      },
                      // 4. Deck exhausted - skip turn (someone else might have matches)
                      {
                        guard: "deckEmpty",
                        target: "changingTurn",
                        actions: "advanceTurn",
                      },
                      // 5. Default: must draw
                      {
                        target: "drawing",
                        actions: "drawCard",
                      },
                    ],
                  },
                },

                autoPlaying: {
                  // Dedicated animation state for auto-playing a single matching card
                  // Shows amber highlight and gives player time to see what's happening
                  after: {
                    autoPlayDelay: {
                      target: "evaluating",
                      actions: "autoPlaySingleCard",
                    },
                  },
                },

                selecting: {
                  //no delay as a player can take as long as they want to select cards
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
                  }
                }
              },
            },
            hist: {
              //for pause/resume  to remember where we were
              type: "history",
              history: "deep",
            },
          },
        },
        paused: {
          on: {
            "round.resume": {
              target: "#cardGame.roundActive.playing.hist",
              actions: "forwardResumeToTimer",
              // Note: Resuming will restart any `after` delays in the restored state.
              // This is XState's expected behavior - history preserves state path,
              // not elapsed delay time. Acceptable for short game animations.
            },
          },
        },
      },
    },

    roundEnd: {
      entry: "calculateScores",
      on: {
        "round.start": {
          target: "roundActive",
          actions: "restartRound",
        },
        "game.over": {
          target: "setup",
          actions: "resetGame",
        },
      },
    },
  },
});
