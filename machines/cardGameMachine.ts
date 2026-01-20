import { setup, assign, sendTo } from "xstate";
import type { GameContext, GameEvent } from "@/lib/types";
import * as Logic from "@/lib/cardGameLogic";
import { GAME_TIMING } from "@/lib/constants";
import { timerMachine } from "./timerMachine";

const TIMER_TICK_MS = 1000;

type InternalEvent = { type: "timing.update"; timing: GameContext['timing'] };

const getRoundStartMs = (
  event: GameEvent | InternalEvent | undefined
): number => {
  if (event && (event.type === "game.start" || event.type === "game.newRound")) {
    return event.timestamp;
  }
  return performance.now();
};

export const cardGameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent | InternalEvent,
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
      const updateEvent = event as Extract<InternalEvent, { type: "timing.update" }>;
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
  /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAnCBxVBbMAxAC4CWuJAdlAHQCuADhKkWANoAMAuoqPQPawSpPhR4gAHogC0AFgCs7agHYAnOwBs6gIzq16gEwAOFQBoQAT2n651XYa1Kl7FVqMb9AXw9m0mHPmp0PloKCABBZFIAN0IObiQQfkFhUQTJBCk5AGZFFUN9GS0ZGQ11GX11M0sMrRVqFRl8vK13R09vEF9sPDBA4NCI6N76ABtUc0ooYjIwdGpSZABrOLEkoRIRMWqpfV2zdIUZLx8MboCgkPDIkhjqUfHJggvQu9RaWDYuVYF1zbTEQ5VKxOY6dU7+XrPK5DO5jCZUWHjWYAFVo6Ao1GQAAswEtJgBhU6wAjiWBEZi9VAAMxY6AAFNjcYtJgARMBwgCUBC6EL6l0GN2GcMmiPMKLRGMZeKohMwsBWCTWKTE6QqWmochk6kMSjkQIQLUM1HYSns1lBPJ6fIG11u93hNHt4vRgTAqAg5mRfEGBAASgB5ACqADkWQB9ACioYVvB+yv+GS1Ngc2iUWTkDgqWXT+pUGeUalc6lNqkMxgt4KtUIFduFCKd6FRLvQbo9Xp9YUDyP9YYACgAZMIATRjiTjG1SoHSafVZbyxbk+XUckX+v0KiU9Ws2qy+iyukXmgrfir-WhgtFIobTYxLfdnu9kQIAGUI-2I-jkQBJYNYMO+iMAEVAy-ACWVHJUJxVRBtRsXUDD3LQMyKfUZDUagslcNDjAcGd2hOE9zjPGshQees4WdW9WwfH0WV9MIAHV-yAkCwIg8c-inRBsxkah9C0HU9QsRAdCNJCDDkY8zkhYjbVIh1RUo6gPhGXFSCoblTmU9k1PY5IoITfi6gk-UdE3ORTVcSSOktIj+Tky9yKRRsJW01Trg0rpqAgOAdMiPTfknCRECM2xrDXXVbDkCSpN5asHPtK8KJcl0VLUx4vPtAL4y4hB9yyagkJKIwlCKfJMJkVDDEUHQBMwuR9BNFQsiOGzKzsm0YUSpyxRSjEIHQVAAHdHlJckWGoalaTpAbhrZTlNMImT7K6utHWSm9vMGkaqGygzcv49UTOEhA0NnKzYtPFaL269bnM2sAolQEZaGYUayQpSaaVmOlHue171Kgebxi5Wzls6m61sUvrqD+l63t2r5FQ4oL0ikFrNyUXYlHkDNDEXLJTBOlQXA1EtDDKBQV3wsElutc9azIu7eoep74cBkkPomqafrhgHWXZEHFuk+mSMc5mlL5hGoFYLR4ljfTOOC07IuKWp2AJkmV0MSqTvyfQwqxkndn43QlEujqGfkpL7tc7FUCoSYb058bKW++kiAlfEsQdmBgfMUH2vBq3xehzb7cdqgbz2pXVQa+p3CE6pl3UDC9HNNq6firq3g+CAnjPV1YFofAY9RkSWmUdhMPCk7XAKPjGqyHX9CcZuTS8DoKD4Hz4ASMHvkV8uMmLRQ0LzZCVDKKz9VkYp6hJvISe1Axl2sgiRY+T36EHwLoMTdgDecbJ1HTdMBI3LJZ8MAqKlPjMLO0G+ygt4OSN3nLlakBDqHHlctFqNPWu2x0ybnHiTbCMhMLZlfqLBKa0P77S-hZXif9J5AKTtIABBUVD8Qpo0MoRhdzqFgdnSGTMw4SkQbHaQDVU5oIAVPQowCQqKAsvYHI7BxIUxxqQ2Sq0KHXjtjiaUUBZQQD7grPeCZswFUJuwQoLgKaNTTKhE0BYa7VWqohLQfDrqMwUkI5s1F2yRGocPWQppf5a3QcwzU+pdwGxahUdcOh2AmiUCQzOIsyEGJtizVyaUPJQHMfvHYMhzKE00LUNWptKgnTkHmPip9LLGEaBVPREM-E9SUrNHaITkZD33uwfUy46hY2ri3Nu1UvEbzivw8hhiNquSloDUJCYSknVULxXYlTyjVI0JkkOt1KEugjlAJ2VDCnSNyp06ouCjQVObv0ypgzvH1P0dbBEWISBknablWQhhTIAPVL05ZrdVnm3WVdLJwxc6QH2V-LIpVbC4JcCuXQuhD5Xzrq3VOBgtTlB1suNMQyIyhEeWjIh9RXClQcNFVurhTLyDqFA9xKcyzMM7h4IAA */
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
        input: ({ context, event }) => ({
          durationMs: context.timing.ROUND_DURATION_MS,
          startMs: getRoundStartMs(event),
          tickIntervalMs: TIMER_TICK_MS,
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
                  },
                },
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
            },
          },
        },
      },
    },

    roundEnd: {
      entry: "calculateScores",
      on: {
        "game.newRound": {
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
