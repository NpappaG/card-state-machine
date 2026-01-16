# Refactoring to Hybrid raise() Pattern

## Document Purpose

This document provides a comprehensive, granular implementation plan for refactoring our XState v5 card game state machine to use the "hybrid raise() pattern" - using `raise()` for decision logic while using simpler direct transitions for deterministic flows.

**Target Audience:** Future maintainers, including our future selves who may need to understand the rationale behind these architectural decisions.

---

## Table of Contents

1. [Background & Context](#background--context)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [Design Principles](#design-principles)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Success Criteria](#success-criteria)

---

## Background & Context

### Project Overview

We're building a real-time multiplayer card game using XState v5 for state management. The game involves:
- Multiple players taking turns
- Card matching rules (play cards that match the top discard pile rank)
- Automatic gameplay when only one valid card exists
- Manual card selection when multiple valid cards exist
- Drawing from deck when no matches exist
- 3-minute round timer
- UI animations synchronized with state transitions

### Why This Refactoring Matters

**Problem Statement:** Our current implementation uses `raise()` + intermediate events for ALL state transitions, including simple timed transitions. This creates unnecessary complexity.

**Business Value:**
1. **Maintainability:** Simpler code is easier to understand and modify
2. **Performance:** Fewer event dispatches means less overhead
3. **Developer Experience:** Less boilerplate means faster feature development
4. **Onboarding:** New team members can understand the flow more quickly

**Technical Value:**
1. **Idiomatic XState v5:** Aligns with framework best practices
2. **Stately Visualizer:** Both approaches render correctly, but simpler is better
3. **Type Safety:** Fewer event types means simpler type definitions
4. **Debugging:** Fewer intermediate steps means clearer execution traces

### Previous Evolution

**Phase 1 (Original):** Used guard arrays in `after` blocks for all routing
```typescript
after: {
  [DELAY]: [
    { guard: 'hasSingleCard', target: 'evaluating', actions: 'autoPlay' },
    { guard: 'hasMultipleCards', target: 'selecting' },
    // ...
  ]
}
```
**Issue:** Stately visualizer showed states as "unreachable" because guards aren't evaluated at design time.

**Phase 2 (Current):** Introduced `raise()` pattern for ALL transitions
```typescript
after: {
  [DELAY]: { actions: 'raiseDrawResolved' }
},
on: {
  DRAW_RESOLVE: 'evaluating'
}
```
**Issue:** Over-engineered. Adds ceremony even for deterministic transitions.

**Phase 3 (Target):** Hybrid approach - `raise()` for decisions, direct transitions for timing
- Keep `raise()` in `decideNextAction` (conditional routing)
- Use direct `after` for `drawing → evaluating` (deterministic)
- Use guard arrays for `evaluating → [roundEnd | changingTurn]` (conditional after delay)

---

## Current State Analysis

### File Structure

```
machines/
  ├── cardGameMachine.ts      (State machine definition - 258 lines)
  └── cardGameLogic.ts        (Pure game logic functions - 70 tests)
lib/
  ├── types.ts                (TypeScript definitions)
  ├── constants.ts            (Timing constants)
  └── hooks/
      ├── useCardGame.ts      (React integration)
      └── useAnimations.ts    (Animation coordination)
tests/
  ├── cardGameMachine.test.ts (8 integration tests)
  └── cardGameLogic.test.ts   (70 unit tests)
```

### Current State Machine Structure

```
idle
  → game.start
setup
  → always
roundActive
  ├── timer.tick (invoked actor)
  └── playerTurn
      ├── checkingCards
      │   → after CHECKING_DELAY
      ├── readyToAct
      │   ├── entry: decideNextAction (raises event)
      │   ├── ROUND_END → #cardGame.roundEnd
      │   ├── AUTO_PLAY → evaluating + autoPlaySingleCard
      │   ├── SELECTING_REQUIRED → selecting
      │   ├── TURN_SKIP → changingTurn
      │   └── DRAW_REQUIRED → drawing
      ├── selecting
      │   ├── card.select → selectCard action
      │   ├── card.deselect → deselectCard action
      │   └── card.play [canPlay] → evaluating + playSelectedCards
      ├── drawing
      │   ├── entry: drawCard
      │   ├── after DRAW_DELAY → raiseDrawResolved
      │   └── DRAW_RESOLVE → evaluating
      ├── evaluating
      │   ├── after EVALUATING_DELAY → raiseEvaluateResolved
      │   └── EVALUATE_RESOLVE
      │       ├── [currentPlayerHasNoCards] → #cardGame.roundEnd
      │       └── → changingTurn
      └── changingTurn
          ├── entry: advanceTurn
          ├── after TURN_CHANGE_DELAY → raiseTurnReady
          └── TURN_READY_INTERNAL → checkingCards
roundEnd
  ├── entry: calculateScores
  └── type: final
```

### Event Types Inventory

**External Events (from UI/user):**
- `game.start` - Initialize game with player count
- `card.select` - Mark card as selected
- `card.deselect` - Unmark card
- `card.play` - Play selected card(s)
- `timer.tick` - Timer updates every second
- `game.newRound` - Start new round (not implemented yet)
- `game.over` - End game (not implemented yet)

**Internal Events (raised by machine):**
- `ROUND_END` - Current player has no cards, round over
- `AUTO_PLAY` - Only one valid card, play automatically
- `SELECTING_REQUIRED` - Multiple valid cards, need user selection
- `TURN_SKIP` - No valid cards and deck empty, skip turn
- `DRAW_REQUIRED` - No valid cards but deck has cards, must draw
- `DRAW_RESOLVE` - Drawing animation complete
- `EVALUATE_RESOLVE` - Evaluation animation complete
- `TURN_READY_INTERNAL` - Turn change animation complete

**Analysis:**
- 8 external events (user-driven)
- 8 internal events (machine-driven)
- **Issue:** Last 3 internal events (`DRAW_RESOLVE`, `EVALUATE_RESOLVE`, `TURN_READY_INTERNAL`) don't carry semantic meaning - they're just timer completion signals

### Actions Inventory

**Pure Context Updates:**
- `initializeGame` - Create players, shuffle deck, deal cards
- `startTimer` - Set timer start timestamp
- `selectCard` - Add card to selectedCards array
- `deselectCard` - Remove card from selectedCards array
- `playSelectedCards` - Move selected cards to discard pile
- `autoPlaySingleCard` - Auto-play the single valid card
- `drawCard` - Draw card from deck to current player's hand
- `advanceTurn` - Increment currentPlayerIndex
- `updateTimer` - Recalculate remaining time
- `calculateScores` - Calculate final scores based on remaining cards

**Routing Actions:**
- `decideNextAction` - Inspect game state, raise appropriate event

**Timer Completion Actions (candidates for removal):**
- `raiseDrawResolved` - Raise DRAW_RESOLVE after draw animation
- `raiseEvaluateResolved` - Raise EVALUATE_RESOLVE after evaluation
- `raiseTurnReady` - Raise TURN_READY_INTERNAL after turn change

**Analysis:**
- 10 pure context updates (good - these are game logic)
- 1 decision action (good - this is routing logic)
- 3 single-use timer actions (candidates for removal - just noise)

### Guards Inventory

**Card Validation:**
- `canPlaySelectedCards` - Check if selected card matches top discard
- `hasMultipleValidCards` - Current player has 2+ matching cards
- `hasSingleValidCard` - Current player has exactly 1 matching card

**Game State:**
- `currentPlayerHasNoCards` - Win condition check
- `timerExpired` - Round timer expired
- `deckEmpty` - No cards left to draw

**Analysis:** All guards are pure functions delegating to `cardGameLogic.ts`. This is good architecture.

---

## Target Architecture

### Design Principles

**Principle 1: Use `raise()` for Conditional Routing**

When the next state depends on runtime conditions (context inspection), use `raise()` with explicit events:

```typescript
readyToAct: {
  entry: 'decideNextAction',  // Raises: AUTO_PLAY | SELECTING_REQUIRED | ...
  on: {
    AUTO_PLAY: { target: 'evaluating', actions: 'autoPlaySingleCard' },
    SELECTING_REQUIRED: { target: 'selecting' },
    // ...
  }
}
```

**Why:**
- Makes decision logic explicit and testable
- Stately visualizer shows all possible paths
- Future developers can see "this is a decision hub"
- Events carry semantic meaning (AUTO_PLAY tells you WHY we're transitioning)

**Principle 2: Use Direct `after` for Deterministic Timing**

When the next state is always the same and just needs animation time, use direct transition:

```typescript
drawing: {
  entry: 'drawCard',
  after: {
    [GAME_TIMING.DRAW_DELAY]: 'evaluating'
  }
}
```

**Why:**
- Simpler code (fewer lines, fewer actions, fewer event types)
- Same Stately visualization quality
- Less indirection to trace through
- Intermediate event carries no semantic meaning (DRAW_RESOLVE just means "wait complete")

**Principle 3: Use Guard Arrays for Conditional After Timing**

When you need to check a condition AFTER a delay, use guard array in `after`:

```typescript
evaluating: {
  after: {
    [GAME_TIMING.EVALUATING_DELAY]: [
      {
        guard: 'currentPlayerHasNoCards',
        target: '#cardGame.roundEnd'
      },
      {
        target: 'changingTurn'
      }
    ]
  }
}
```

**Why:**
- Idiomatic XState v5 pattern
- Stately shows both paths with guard labels
- No need for intermediate event just to re-check conditions
- Timing and logic are colocated

**Principle 4: Event Naming Convention**

- External events: `namespace.action` (e.g., `game.start`, `card.select`)
- Internal decision events: Keep SCREAMING_SNAKE_CASE for now (consistent with existing)
  - Alternative: Could use `internal.autoPlay` for consistency, but SCREAMING_SNAKE_CASE visually distinguishes internal from external

**Principle 5: Single Responsibility for Actions**

- Actions should either:
  - Update context (pure function)
  - OR raise an event (routing)
  - NOT both
- If an action only raises an event and is used once, inline it

### Target State Machine Structure

```
idle
  → game.start
setup
  → always
roundActive
  ├── timer.tick (invoked actor)
  └── playerTurn
      ├── checkingCards
      │   → after CHECKING_DELAY
      ├── readyToAct
      │   ├── entry: decideNextAction (raises event) ✓ KEEP - Decision logic
      │   ├── ROUND_END → #cardGame.roundEnd
      │   ├── AUTO_PLAY → evaluating + autoPlaySingleCard
      │   ├── SELECTING_REQUIRED → selecting
      │   ├── TURN_SKIP → changingTurn
      │   └── DRAW_REQUIRED → drawing
      ├── selecting
      │   ├── card.select → selectCard action
      │   ├── card.deselect → deselectCard action
      │   └── card.play [canPlay] → evaluating + playSelectedCards
      ├── drawing
      │   ├── entry: drawCard
      │   └── after DRAW_DELAY → evaluating ✓ CHANGE - Direct transition
      ├── evaluating
      │   └── after EVALUATING_DELAY ✓ CHANGE - Guard array
      │       ├── [currentPlayerHasNoCards] → #cardGame.roundEnd
      │       └── → changingTurn
      └── changingTurn
          ├── entry: advanceTurn
          └── after TURN_CHANGE_DELAY → checkingCards ✓ CHANGE - Direct transition
roundEnd
  ├── entry: calculateScores
  └── type: final
```

### Event Types Changes

**Remove these internal events (no longer needed):**
- ~~`DRAW_RESOLVE`~~
- ~~`EVALUATE_RESOLVE`~~
- ~~`TURN_READY_INTERNAL`~~

**Keep these internal events (semantic value):**
- `ROUND_END` - Win condition met
- `AUTO_PLAY` - Single card auto-play
- `SELECTING_REQUIRED` - Multiple cards need selection
- `TURN_SKIP` - No valid moves, skip turn
- `DRAW_REQUIRED` - Must draw from deck

**Also remove from types.ts:**
Currently `lib/types.ts` has duplicate definitions of internal events in the `GameEvent` union. These should be removed because:
1. They're truly internal (never sent from UI)
2. They're defined in the machine file's `InternalEvent` type
3. Having them in both places creates confusion

### Actions Changes

**Remove these actions (no longer needed):**
- ~~`raiseDrawResolved`~~
- ~~`raiseEvaluateResolved`~~
- ~~`raiseTurnReady`~~

**Keep all other actions:**
- All 10 pure context update actions
- `decideNextAction` routing action

---

## Implementation Plan

### Task Dependency Graph

```
Task 1: Remove duplicate events from types.ts
  └─> Task 2: Remove internal events from InternalEvent union
      └─> Task 3: Remove raise action definitions
          ├─> Task 4: Refactor drawing state
          ├─> Task 5: Refactor evaluating state
          └─> Task 6: Refactor changingTurn state
              └─> Task 7: Run test suite
                  └─> Task 8: Manual verification
```

**Critical Path:** All tasks are sequential (no parallelization opportunity)

**Estimated Time:** 30-45 minutes (with testing)

---

### Task 1: Remove Duplicate Internal Events from types.ts

**File:** `lib/types.ts`

**Current State (lines 40-54):**
```typescript
export type GameEvent =
  // External events (from UI/user)
  | { type: 'game.start'; playerCount: number; playerNames?: string[] }
  | { type: 'card.select'; cardId: string }
  | { type: 'card.deselect'; cardId: string }
  | { type: 'card.play' }
  | { type: 'timer.tick' }
  | { type: 'game.newRound' }
  | { type: 'game.over' }
  // Internal events (raised by machine actions)
  | { type: 'AUTO_PLAY' }
  | { type: 'SELECTING_REQUIRED' }
  | { type: 'DRAW_REQUIRED' }
  | { type: 'TURN_SKIP' }
  | { type: 'ROUND_END' };
```

**Target State:**
```typescript
export type GameEvent =
  // External events (from UI/user)
  | { type: 'game.start'; playerCount: number; playerNames?: string[] }
  | { type: 'card.select'; cardId: string }
  | { type: 'card.deselect'; cardId: string }
  | { type: 'card.play' }
  | { type: 'timer.tick' }
  | { type: 'game.newRound' }
  | { type: 'game.over' };
```

**Reasoning:**
- Internal events should NOT be part of the public API type
- They're implementation details of the state machine
- UI components should never send these events
- Removing them prevents accidental misuse

**Change:**
Remove lines 49-54 (the internal events comment and 5 event types).

**Verification:**
- TypeScript should still compile
- UI components use `actor.send()` with external events only
- Machine uses internal events via `raise()` internally

**Dependencies:** None - this is the first step

**Risks:** Low - these events are only used internally in the machine

---

### Task 2: Remove Timer Completion Events from InternalEvent Union

**File:** `machines/cardGameMachine.ts`

**Current State (lines 15-23):**
```typescript
type InternalEvent =
  | { type: 'ROUND_END' }
  | { type: 'AUTO_PLAY' }
  | { type: 'SELECTING_REQUIRED' }
  | { type: 'TURN_SKIP' }
  | { type: 'DRAW_REQUIRED' }
  | { type: 'DRAW_RESOLVE' }
  | { type: 'EVALUATE_RESOLVE' }
  | { type: 'TURN_READY_INTERNAL' };
```

**Target State:**
```typescript
type InternalEvent =
  | { type: 'ROUND_END' }
  | { type: 'AUTO_PLAY' }
  | { type: 'SELECTING_REQUIRED' }
  | { type: 'TURN_SKIP' }
  | { type: 'DRAW_REQUIRED' };
```

**Reasoning:**
- `DRAW_RESOLVE`, `EVALUATE_RESOLVE`, `TURN_READY_INTERNAL` will no longer be raised
- They don't carry semantic meaning - they just signal "timer done"
- Direct `after` transitions replace this pattern

**Change:**
Remove lines 21-23 (the three timer completion event types).

**Verification:**
- TypeScript will show errors on the removed actions (expected - we'll fix in Task 3)
- The union type will be cleaner and more focused

**Dependencies:** Task 1 must be complete (ensures no conflicts with types.ts)

**Risks:** Low - TypeScript will catch any remaining references

---

### Task 3: Remove Raise Action Definitions

**File:** `machines/cardGameMachine.ts`

**Current State (lines 70-73):**
```typescript
actions: {
  // ... other actions ...

  // Internal raise actions
  raiseDrawResolved: raise(() => ({ type: 'DRAW_RESOLVE' })),
  raiseEvaluateResolved: raise(() => ({ type: 'EVALUATE_RESOLVE' })),
  raiseTurnReady: raise(() => ({ type: 'TURN_READY_INTERNAL' })),

  // ... more actions ...
}
```

**Target State:**
```typescript
actions: {
  // ... other actions ...

  // (removed internal raise actions - no longer needed)

  // ... more actions ...
}
```

**Reasoning:**
- These actions are single-use helpers that just raise events
- They don't provide meaningful abstraction
- Removing them reduces boilerplate

**Change:**
Remove lines 70-73 (comment and three action definitions).

**Verification:**
- TypeScript will show errors where these actions are referenced (expected - we'll fix in Tasks 4-6)

**Dependencies:** Task 2 must be complete (event types removed)

**Risks:** Low - clear compile errors will show where to update

---

### Task 4: Refactor drawing State

**File:** `machines/cardGameMachine.ts`

**Current State (lines 205-214):**
```typescript
drawing: {
  entry: 'drawCard',
  after: {
    [GAME_TIMING.DRAW_DELAY]: {
      actions: 'raiseDrawResolved',
    },
  },
  on: {
    DRAW_RESOLVE: 'evaluating',
  },
},
```

**Target State:**
```typescript
drawing: {
  entry: 'drawCard',
  after: {
    [GAME_TIMING.DRAW_DELAY]: 'evaluating',
  },
},
```

**Reasoning:**
- Drawing ALWAYS goes to evaluating after the delay
- No conditional logic needed
- The intermediate `DRAW_RESOLVE` event adds no value
- Direct transition is simpler and equally clear in Stately

**Benefits:**
- Removes 6 lines of code
- No intermediate event to trace
- Same visual representation in Stately
- Animation timing unchanged (still uses DRAW_DELAY)

**Change:**
Replace lines 205-214 with simplified version (9 lines → 5 lines).

**Testing:**
- Existing test `tests/cardGameMachine.test.ts` should still pass
- No behavioral change - just internal implementation detail

**Dependencies:** Task 3 must be complete (raiseDrawResolved removed)

**Risks:** Low - deterministic flow, no conditional logic

---

### Task 5: Refactor evaluating State

**File:** `machines/cardGameMachine.ts`

**Current State (lines 217-233):**
```typescript
evaluating: {
  after: {
    [GAME_TIMING.EVALUATING_DELAY]: {
      actions: 'raiseEvaluateResolved',
    },
  },
  on: {
    EVALUATE_RESOLVE: [
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
```

**Target State:**
```typescript
evaluating: {
  after: {
    [GAME_TIMING.EVALUATING_DELAY]: [
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
```

**Reasoning:**
- After evaluation delay, check win condition
- This is perfect for guard array pattern
- No need for intermediate `EVALUATE_RESOLVE` event
- Timing and conditional logic are colocated

**Benefits:**
- Removes 7 lines of code (17 lines → 10 lines)
- Guard array is idiomatic XState v5
- Stately shows both paths with guard labels
- Easier to understand: "wait, then check condition"

**Change:**
Replace lines 217-233 with guard array version.

**Testing:**
- Test "evaluating state is observable with EVALUATING_DELAY" should still pass
- Test "selecting state transitions to evaluating when selection matches top card" should still pass
- Behavior identical - just moved guards from `on:` to `after:`

**Dependencies:** Task 3 must be complete (raiseEvaluateResolved removed)

**Risks:** Low - guard logic unchanged, just moved location

**Important Note:**
The guard `currentPlayerHasNoCards` checks if the CURRENT player (before turn advance) has no cards. This is the win condition check. After evaluation:
- If player has no cards → round ends
- If player has cards → turn advances to next player

This logic is correct in both implementations.

---

### Task 6: Refactor changingTurn State

**File:** `machines/cardGameMachine.ts`

**Current State (lines 236-246):**
```typescript
changingTurn: {
  entry: 'advanceTurn',
  after: {
    [GAME_TIMING.TURN_CHANGE_DELAY]: {
      actions: 'raiseTurnReady',
    },
  },
  on: {
    TURN_READY_INTERNAL: 'checkingCards',
  },
},
```

**Target State:**
```typescript
changingTurn: {
  entry: 'advanceTurn',
  after: {
    [GAME_TIMING.TURN_CHANGE_DELAY]: 'checkingCards',
  },
},
```

**Reasoning:**
- Turn change ALWAYS goes to checkingCards after delay
- No conditional logic needed
- The intermediate `TURN_READY_INTERNAL` event adds no value
- Direct transition is simpler

**Benefits:**
- Removes 6 lines of code (11 lines → 5 lines)
- Completes the turn cycle cleanly
- Animation timing unchanged

**Change:**
Replace lines 236-246 with simplified version.

**Testing:**
- All existing tests should pass
- This is the final step in the turn loop

**Dependencies:** Task 3 must be complete (raiseTurnReady removed)

**Risks:** Low - deterministic flow

---

### Task 7: Run Complete Test Suite

**Command:** `bun run test`

**Expected Results:**
- All 78 tests pass (70 logic + 8 machine tests)
- No TypeScript compilation errors
- No runtime errors

**Specific Tests to Verify:**

**Unit Tests (cardGameLogic.test.ts):**
- All 70 logic tests should pass unchanged
- These test pure functions, not affected by machine structure

**Integration Tests (cardGameMachine.test.ts):**
1. ✅ "selecting state transitions to evaluating when selection matches top card"
   - Verifies card.play event works
   - Checks transition to evaluating state
   - Validates card removed from hand

2. ✅ "invalid selection keeps machine in selecting state"
   - Verifies guard prevents invalid plays
   - Stays in selecting state

3. ✅ "card.select adds card to selection when available"
   - Tests selectCard action

4. ✅ "card.deselect removes card from selection"
   - Tests deselectCard action

5. ✅ "idle transitions to roundActive on game.start event"
   - Tests initialization flow
   - Verifies deck and players created

6. ✅ "selecting state waits for valid card.play before transitioning"
   - Tests full selection flow
   - Verifies discard pile updated

7. ✅ "evaluating state is observable with EVALUATING_DELAY"
   - **CRITICAL:** Verifies timing delay creates observable state
   - This validates our refactored guard array approach

8. ✅ "checkingCards state exists briefly with CHECKING_DELAY"
   - Tests decision routing delay

**If Any Tests Fail:**

**Scenario 1: State shape mismatch**
- Symptom: `expect(value).toEqual({ roundActive: { playerTurn: 'X' } })` fails
- Cause: State transition path changed
- Fix: Trace through state machine, verify transitions correct

**Scenario 2: Timing issue**
- Symptom: State advances too quickly or not at all
- Cause: `after` block malformed
- Fix: Check syntax of guard array in `after`

**Scenario 3: Type error**
- Symptom: TypeScript compilation fails
- Cause: Event type still referenced somewhere
- Fix: Search codebase for removed event types

**Dependencies:** Tasks 1-6 must be complete

**Risks:** Medium - integration tests could reveal edge cases

---

### Task 8: Manual Verification in Stately Visualizer

**Steps:**

1. **Open Stately Visualizer**
   - Visit https://stately.ai/registry/editor
   - Import `machines/cardGameMachine.ts`

2. **Verify State Visibility**
   - All states should be shown (no "unreachable" warnings)
   - `selecting`, `drawing`, `evaluating`, `changingTurn` should all be reachable

3. **Verify Transition Clarity**
   - `readyToAct` state shows 5 outgoing transitions:
     - ROUND_END → roundEnd
     - AUTO_PLAY → evaluating
     - SELECTING_REQUIRED → selecting
     - TURN_SKIP → changingTurn
     - DRAW_REQUIRED → drawing
   - `drawing` state shows 1 outgoing transition (after delay):
     - → evaluating
   - `evaluating` state shows 2 outgoing transitions (after delay with guards):
     - [currentPlayerHasNoCards] → roundEnd
     - [else] → changingTurn
   - `changingTurn` state shows 1 outgoing transition (after delay):
     - → checkingCards

4. **Verify Decision Node Clarity**
   - `readyToAct` should visually stand out as the decision hub
   - The 5 different paths should be clear

5. **Compare Before/After**
   - Before: 8 internal events, extra nodes for DRAW_RESOLVE, etc.
   - After: 5 internal events, cleaner flow diagram

**Expected Outcome:**
- Visualizer correctly shows all states and transitions
- Flow is easier to understand at a glance
- Decision points are clear vs. simple delays

**Dependencies:** Task 7 must pass (tests green)

**Risks:** Low - visualization only, doesn't affect runtime

---

## Testing Strategy

### Test Coverage Matrix

| Component | Test Type | Test Count | Status | Notes |
|-----------|-----------|------------|--------|-------|
| Pure Logic | Unit | 70 | ✅ Pass | cardGameLogic.test.ts - unchanged |
| State Machine | Integration | 8 | ✅ Pass | cardGameMachine.test.ts - unchanged |
| Type Safety | Compile-time | N/A | ✅ Pass | TypeScript compiler |
| Visual | Manual | 1 | ⏳ Pending | Stately visualizer check |

### Test Philosophy

**Unit Tests (cardGameLogic.test.ts):**
- Test pure functions in isolation
- No state machine dependency
- Fast execution (~50ms)
- **Impact of refactor:** NONE - logic unchanged

**Integration Tests (cardGameMachine.test.ts):**
- Test state machine behavior
- Use `createActor` and `buildActor` helpers
- Test state transitions and context updates
- **Impact of refactor:** MINIMAL - behavior unchanged, only internal implementation

**Manual Tests:**
- Stately visualizer correctness
- UI animation timing
- **Impact of refactor:** NONE - same timing constants

### Regression Prevention

**What Could Break:**

1. **State transitions don't fire**
   - Symptom: Machine gets stuck in a state
   - Detection: Integration tests timeout
   - Prevention: Run full test suite after each task

2. **Guard logic broken**
   - Symptom: Wrong path taken in evaluating state
   - Detection: Tests check context after transition
   - Prevention: Guard functions unchanged (just moved location)

3. **Type safety compromised**
   - Symptom: TypeScript errors or unsafe casts needed
   - Detection: Compilation fails
   - Prevention: Strict type checking enabled

4. **Animation timing off**
   - Symptom: UI feels wrong, animations cut off
   - Detection: Manual testing
   - Prevention: Timing constants unchanged

**Safety Nets:**

1. **TDD Approach:** Tests written first, all passing before refactor
2. **Small Steps:** Each task is atomic and testable
3. **Type Safety:** TypeScript catches structural errors
4. **Git Workflow:** Commit after each task, easy to revert
5. **Manual Verification:** Final Stately check before shipping

---

## Success Criteria

### Functional Requirements

✅ **All 78 tests pass**
- 70 unit tests (cardGameLogic.test.ts)
- 8 integration tests (cardGameMachine.test.ts)

✅ **No TypeScript errors**
- Strict mode enabled
- No `any` types introduced
- No type assertions needed

✅ **Behavior unchanged**
- Game plays identically
- All timing delays preserved
- Animation coordination works

### Code Quality Requirements

✅ **Reduced complexity**
- Fewer lines of code (estimate: 30-40 lines removed)
- Fewer event types (from 8 to 5 internal events)
- Fewer action definitions (from 13 to 11 actions)

✅ **Improved readability**
- Decision points clear (`raise()` with semantic events)
- Simple flows clear (direct `after` transitions)
- Guard arrays used idiomatically

✅ **Better documentation**
- Comments explain pattern choices
- This document captures rationale
- Future maintainers understand "why"

### Architectural Requirements

✅ **Idiomatic XState v5**
- Uses `raise()` for conditional routing
- Uses direct `after` for deterministic timing
- Uses guard arrays for conditional delays

✅ **Stately visualizer compatible**
- All states shown as reachable
- Transitions clearly labeled
- Flow easy to understand visually

✅ **Maintainability improved**
- Less boilerplate for future features
- Pattern clear for new transitions
- Self-documenting structure

---

## Post-Implementation

### Documentation Updates Needed

1. **README.md** - Update architecture section if it describes state machine
2. **Code comments** - Ensure machine structure comments are accurate
3. **This document** - Add "Completed" section with actual results

### Future Considerations

**When to use each pattern:**

1. **Use `raise()` when:**
   - Next state depends on context values
   - Multiple possible paths exist
   - Decision logic is complex
   - Example: `readyToAct → decideNextAction`

2. **Use direct `after` when:**
   - Next state is always the same
   - Just need animation/timing delay
   - No conditional logic
   - Example: `drawing → evaluating`

3. **Use guard array when:**
   - Need to check condition after delay
   - 2-3 possible paths
   - Guards are simple booleans
   - Example: `evaluating → [roundEnd | changingTurn]`

**Anti-patterns to avoid:**

❌ Don't use `raise()` for unconditional routing
❌ Don't create single-use raise actions
❌ Don't put timer completion events in public API types
❌ Don't over-engineer simple flows

### Related Work

**Not in scope for this refactor:**
- Adding new game features
- Refactoring React components
- Changing animation timing values
- Optimizing performance
- Adding new test coverage

**Potential future refactors:**
- Extract `readyToAct` decision logic into separate file
- Add more granular turn substates for complex interactions
- Implement multi-round game support
- Add player AI for single-player mode

---

## Appendix A: Event Flow Diagrams

### Current Flow (Before Refactor)

```
checkingCards
  ↓ (after CHECKING_DELAY)
readyToAct
  ↓ (entry: decideNextAction)
  ├─ raises: AUTO_PLAY ────────→ evaluating
  ├─ raises: SELECTING_REQUIRED → selecting
  ├─ raises: DRAW_REQUIRED ────→ drawing
  ├─ raises: TURN_SKIP ────────→ changingTurn
  └─ raises: ROUND_END ────────→ roundEnd

drawing
  ↓ (entry: drawCard)
  ↓ (after DRAW_DELAY)
  ↓ (actions: raiseDrawResolved)
DRAW_RESOLVE event
  ↓ (on: DRAW_RESOLVE)
evaluating

evaluating
  ↓ (after EVALUATING_DELAY)
  ↓ (actions: raiseEvaluateResolved)
EVALUATE_RESOLVE event
  ↓ (on: EVALUATE_RESOLVE)
  ├─ [guard: currentPlayerHasNoCards] → roundEnd
  └─ [else] ──────────────────────────→ changingTurn

changingTurn
  ↓ (entry: advanceTurn)
  ↓ (after TURN_CHANGE_DELAY)
  ↓ (actions: raiseTurnReady)
TURN_READY_INTERNAL event
  ↓ (on: TURN_READY_INTERNAL)
checkingCards (loop)
```

### Target Flow (After Refactor)

```
checkingCards
  ↓ (after CHECKING_DELAY)
readyToAct
  ↓ (entry: decideNextAction)
  ├─ raises: AUTO_PLAY ────────→ evaluating
  ├─ raises: SELECTING_REQUIRED → selecting
  ├─ raises: DRAW_REQUIRED ────→ drawing
  ├─ raises: TURN_SKIP ────────→ changingTurn
  └─ raises: ROUND_END ────────→ roundEnd

drawing
  ↓ (entry: drawCard)
  ↓ (after DRAW_DELAY)
evaluating ✨ SIMPLIFIED

evaluating
  ↓ (after EVALUATING_DELAY)
  ├─ [guard: currentPlayerHasNoCards] → roundEnd
  └─ [else] ──────────────────────────→ changingTurn ✨ GUARD ARRAY

changingTurn
  ↓ (entry: advanceTurn)
  ↓ (after TURN_CHANGE_DELAY)
checkingCards (loop) ✨ SIMPLIFIED
```

**Key Differences:**
- ❌ Removed: `DRAW_RESOLVE` event and raise action
- ❌ Removed: `EVALUATE_RESOLVE` event and raise action
- ❌ Removed: `TURN_READY_INTERNAL` event and raise action
- ✅ Kept: `readyToAct` decision routing (semantic value)
- ✨ Simplified: Direct transitions for deterministic flows

---

## Appendix B: Code Diffs

### Before: drawing State

```typescript
drawing: {
  entry: 'drawCard',
  after: {
    [GAME_TIMING.DRAW_DELAY]: {
      actions: 'raiseDrawResolved',  // Raise intermediate event
    },
  },
  on: {
    DRAW_RESOLVE: 'evaluating',      // Listen for event
  },
},
```

### After: drawing State

```typescript
drawing: {
  entry: 'drawCard',
  after: {
    [GAME_TIMING.DRAW_DELAY]: 'evaluating',  // Direct transition
  },
},
```

**Diff:** -6 lines, +1 line = Net -5 lines

---

### Before: evaluating State

```typescript
evaluating: {
  after: {
    [GAME_TIMING.EVALUATING_DELAY]: {
      actions: 'raiseEvaluateResolved',  // Raise intermediate event
    },
  },
  on: {
    EVALUATE_RESOLVE: [                  // Listen for event, then route
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
```

### After: evaluating State

```typescript
evaluating: {
  after: {
    [GAME_TIMING.EVALUATING_DELAY]: [    // Guard array directly in after
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
```

**Diff:** -9 lines, +2 lines = Net -7 lines

---

### Before: changingTurn State

```typescript
changingTurn: {
  entry: 'advanceTurn',
  after: {
    [GAME_TIMING.TURN_CHANGE_DELAY]: {
      actions: 'raiseTurnReady',      // Raise intermediate event
    },
  },
  on: {
    TURN_READY_INTERNAL: 'checkingCards',  // Listen for event
  },
},
```

### After: changingTurn State

```typescript
changingTurn: {
  entry: 'advanceTurn',
  after: {
    [GAME_TIMING.TURN_CHANGE_DELAY]: 'checkingCards',  // Direct transition
  },
},
```

**Diff:** -6 lines, +1 line = Net -5 lines

---

## Appendix C: Glossary

**Term** | **Definition**
---------|---------------
**Actor** | Running instance of a state machine (created with `createActor()`)
**After transition** | Delayed transition using `after: { DELAY: target }` syntax
**Always transition** | Transition that fires immediately when state is entered
**Assign** | XState action that updates context immutably
**Context** | Data associated with state machine instance (like Redux state)
**Entry action** | Action that runs when entering a state
**Event** | Message sent to state machine to trigger transitions
**External event** | Event sent from outside (UI, user input, timer)
**Guard** | Boolean function that controls whether transition occurs
**Guard array** | Multiple transitions with guards, first match wins
**Internal event** | Event raised within machine via `raise()` action
**Invoke** | Spawn a child actor (like timer) that lives while parent state is active
**Machine** | Blueprint/definition of state machine (created with `setup().createMachine()`)
**Raise** | Action that emits an event internally (no external send needed)
**Snapshot** | Immutable representation of machine state at a point in time
**State** | Named location in the state machine graph
**Transition** | Movement from one state to another

---

## Appendix D: XState v5 Pattern Reference

### Pattern: Decision + Raise

**When to use:** Routing based on runtime conditions

```typescript
// State that makes a decision
decisionState: {
  entry: raise(({ context }) => {
    if (condition1) return { type: 'ROUTE_A' };
    if (condition2) return { type: 'ROUTE_B' };
    return { type: 'ROUTE_C' };
  }),
  on: {
    ROUTE_A: { target: 'stateA' },
    ROUTE_B: { target: 'stateB' },
    ROUTE_C: { target: 'stateC' },
  }
}
```

**Benefits:**
- Explicit routing logic
- Testable in isolation
- Clear in visualizer
- Events carry semantic meaning

### Pattern: Direct After Transition

**When to use:** Unconditional delay

```typescript
// State that just waits
waitingState: {
  entry: 'doSomething',
  after: {
    [DELAY]: 'nextState'
  }
}
```

**Benefits:**
- Simple and concise
- Clear intent
- No intermediate events
- Same visualizer quality

### Pattern: Guard Array in After

**When to use:** Conditional routing after delay

```typescript
// State that waits then decides
checkingState: {
  after: {
    [DELAY]: [
      { guard: 'conditionA', target: 'stateA' },
      { guard: 'conditionB', target: 'stateB' },
      { target: 'defaultState' }
    ]
  }
}
```

**Benefits:**
- Idiomatic XState
- Timing and logic colocated
- Visualizer shows all paths with labels
- No need for intermediate event

### Pattern: Conditional Always

**When to use:** Immediate routing (no delay)

```typescript
// State that immediately routes
routingState: {
  always: [
    { guard: 'conditionA', target: 'stateA' },
    { guard: 'conditionB', target: 'stateB' },
    { target: 'defaultState' }
  ]
}
```

**Benefits:**
- No delay (synchronous)
- Useful for pure routing nodes
- Guard array syntax

**Caution:** Can cause "unreachable" warnings in Stately if guards are complex

---

## Document Metadata

**Created:** 2026-01-16
**Author:** Development Team
**Version:** 1.0
**Status:** Ready for Implementation
**Related Files:**
- `machines/cardGameMachine.ts` (primary target)
- `lib/types.ts` (event types)
- `tests/cardGameMachine.test.ts` (verification)

**Review Checklist:**
- [ ] All tasks have clear acceptance criteria
- [ ] Dependencies are explicitly stated
- [ ] Risks are identified and mitigated
- [ ] Success criteria are measurable
- [ ] Rollback plan exists (git revert)
- [ ] Future maintainers can understand rationale

**Estimated Impact:**
- Lines removed: ~30-40
- Event types removed: 3
- Action definitions removed: 3
- Test changes: 0 (all pass unchanged)
- Behavior changes: 0 (internal refactor only)
- Time to implement: 30-45 minutes

---

## Questions for Future Implementer

Before starting, ask yourself:

1. **Do I understand the "why"?** Can you explain in your own words why we're doing this refactor?

2. **Do I understand the patterns?** Can you identify when to use `raise()` vs direct `after` vs guard array?

3. **Have I read the full document?** All sections contain important context.

4. **Am I ready to test?** Test suite ready to run after each task?

5. **Do I have a rollback plan?** Can you revert cleanly if something goes wrong?

If you answered "no" to any question, re-read the relevant sections before proceeding.

---

**Remember:** This refactor is about **clarity and maintainability**, not new features. The game should play identically before and after. Take your time, test after each step, and commit frequently. Future you will thank present you.

**Happy coding! 🚀**
