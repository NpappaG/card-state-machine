# Hybrid raise() Pattern (Current)

## Document Purpose

This document describes the current hybrid raise() pattern used in the XState v5 card game machine. It is a reference for how we structure decision routing and deterministic timing.

**Target Audience:** Maintainers working on game logic or UI integration.

---

## Table of Contents

1. Background & Context
2. Current State Analysis
3. Hybrid Pattern Details
4. Testing Notes

---

## Background & Context

### Project Overview

We're building a real-time multiplayer card game using XState v5. The game involves:
- Multiple players taking turns
- Card matching rules (play cards that match the top discard pile rank)
- Automatic gameplay when only one valid card exists
- Manual card selection when multiple valid cards exist
- Drawing from deck when no matches exist
- 3-minute round timer
- UI animations synchronized with state transitions

### Why This Pattern Matters

We use a hybrid approach to keep the machine easy to read and to avoid extra internal events:
1. Use raise() for decisions where multiple outcomes are possible.
2. Use direct after transitions for deterministic delays.
3. Keep context updates pure and in cardGameLogic.ts.

### Previous Evolution (Summary)

- Phase 1: Guard arrays inside after for all routing (hard to visualize).
- Phase 2: raise() for all transitions (too much ceremony).
- Phase 3 (Current): raise() for decisions, direct after for timing.

---

## Current State Analysis

### File Structure

```
machines/
  cardGameMachine.ts
  cardGameLogic.ts
lib/
  types.ts
  constants.ts
  hooks/useCardGame.ts
  hooks/useAnimations.ts
tests/
  cardGameMachine.test.ts
  cardGameLogic.test.ts
```

### Current State Machine Structure

```
setup
  -> game.start -> roundActive
roundActive
  - timing.update (top-level action)
  - timer.tick (invoked actor)
  - always [timerExpired] -> roundEnd
  - playerTurn
      checkingCards
        -> after CHECKING_DELAY -> readyToAct
      readyToAct
        entry: decideNextAction (raise)
        ROUND_END -> #cardGame.roundEnd
        AUTO_PLAY -> evaluating + autoPlaySingleCard
        SELECTING_REQUIRED -> selecting
        DRAW_REQUIRED -> drawing
      selecting
        card.select -> selectCard
        card.deselect -> deselectCard
        card.play [canPlaySelectedCards] -> evaluating + playSelectedCards
      drawing
        entry: drawCard
        after DRAW_DELAY -> evaluating
      evaluating
        after EVALUATING_DELAY:
          [currentPlayerHasNoCards] -> #cardGame.roundEnd
          -> changingTurn
      changingTurn
        entry: advanceTurn
        after TURN_CHANGE_DELAY -> checkingCards
roundEnd
  entry: calculateScores
  game.start -> roundActive
```

### Event Types Inventory

**External events (from UI or system):**
- game.start
- card.select
- card.deselect
- card.play
- timer.tick (emitted by the timer actor)
- timing.update (timing config changes)
- game.newRound (reserved, not implemented)
- game.over (reserved, not implemented)

**Internal events (raised by decideNextAction):**
- ROUND_END
- AUTO_PLAY
- SELECTING_REQUIRED
- DRAW_REQUIRED

### Actions Inventory

**Setup and routing:**
- initializeGame
- startTimer
- decideNextAction
- updateTimingConfig

**Card actions:**
- selectCard
- deselectCard
- playSelectedCards
- autoPlaySingleCard
- drawCard
- advanceTurn

**Timing and scoring:**
- updateTimer
- calculateScores

### Guards Inventory

- canPlaySelectedCards
- currentPlayerHasNoCards
- timerExpired

Note: determineNextAction in cardGameLogic.ts uses hasSingleValidCard, hasMultipleValidCards, and deckEmpty internally.

---

## Hybrid Pattern Details

### Design Principles

1) Use raise() for conditional routing
- readyToAct raises one internal event that documents why the machine is moving.
- This keeps the decision logic explicit and easy to test.

2) Use direct after for deterministic timing
- drawing -> evaluating and changingTurn -> checkingCards are linear and timed.
- No extra internal event is needed when the path is always the same.

3) Use guard arrays for conditional delayed outcomes
- evaluating checks win conditions after a delay and chooses roundEnd or changingTurn.

4) Event naming
- External events use dot notation (game.start, card.play).
- Internal decision events use SCREAMING_SNAKE_CASE to stand out.

5) Single responsibility for actions
- Actions either update context (pure reducers) or raise an event.
- Avoid mixing routing and state updates in a single action.

### Pattern Summary

- checkingCards waits for CHECKING_DELAY, then routes via readyToAct.
- readyToAct raises one of ROUND_END, AUTO_PLAY, SELECTING_REQUIRED, or DRAW_REQUIRED.
- drawing, evaluating, and changingTurn use after delays for pacing.
- roundEnd calculates scores and can restart on game.start.

---

## Testing Notes

- Unit tests in tests/cardGameLogic.test.ts cover the pure logic functions.
- Integration tests in tests/cardGameMachine.test.ts cover state transitions and delay observability.
- Timing is configured via context.timing and updated through timing.update.
