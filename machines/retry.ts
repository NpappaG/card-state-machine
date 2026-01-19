import { createMachine } from "xstate";

export const machine = createMachine({
  id: "cardGame",
  initial: "setup",

  context: {
    deck: [],
    timing: {
      autoPlayDelayMs: 350,
      checkingDelayMs: 250
    },
    players: [],
    discardPile: [],
    validMatches: [],
    currentPlayerIndex: 0
  },

  states: {
    setup: {
      on: {
        "game.start": { target: "roundActive" }
      }
    },

    roundActive: {
      on: {
        "TIMER.EXPIRED": { target: "roundEnd" }
      },

      initial: "playerTurn",
      states: {
        playerTurn: {
          initial: "checkingDelay",
          states: {
            checkingDelay: {
              entry: "computeMatches",

              // Use a literal number so parsers don't need delays/functions
              // If you want it configurable, replace 250 with context.timing.checkingDelayMs
              // once you're back in real code (not the strict parser).
              after: {
                250: [
                  { guard: "hasMultipleMatches", target: "selecting" },
                  { guard: "hasSingleMatch", target: "autoPlaySingle" },
                  { guard: "hasNoMatches", target: "drawing" }
                ]
              }
            },

            selecting: {
              on: {
                "card.toggle": { actions: "toggleSelected" },
                "cards.playSelected": {
                  guard: "canPlaySelectedCards",
                  actions: "playSelected",
                  target: "evaluating"
                }
              }
            },

            autoPlaySingle: {
              after: {
                350: { actions: "autoPlaySingle", target: "evaluating" }
              }
            },

            drawing: {
              after: {
                350: { actions: "drawCard", target: "evaluating" }
              }
            },

            evaluating: {
              always: [
                { guard: "isPlayerEmpty", target: "#cardGame.roundEnd" },
                { target: "changeTurn" }
              ]
            },

            changeTurn: {
              entry: "advanceTurn",
              always: { target: "checkingDelay" }
            }
          }
        }
      }
    },

    roundEnd: {
      entry: "calculateScores"
    }
  }
});