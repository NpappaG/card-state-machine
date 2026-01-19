# Decision Pattern Refactoring

## Summary

Simplified the decision-making logic by replacing the `raise` pattern with guarded transitions. Collapsed `checkingCards` → `readyToAct` into a single state with direct guard evaluation.

## What Changed

### Before: Raise Pattern (Indirect)

```typescript
// Two states + internal events + action
checkingCards: {
  after: { checkingDelay: "readyToAct" }
},
readyToAct: {
  entry: "decideNextAction",  // ← raises internal event
  on: {
    ROUND_END: { target: "#cardGame.roundEnd" },
    SELECTING_REQUIRED: { target: "selecting" },
    AUTO_PLAY: { target: "evaluating", actions: "autoPlaySingleCard" },
    DRAW_REQUIRED: { target: "drawing", actions: "drawCard" },
  }
}
```

**Flow:** State → Action (raise event) → Internal event → Handler

### After: Guarded Transitions (Direct)

```typescript
// Single state + guards
checkingCards: {
  after: {
    checkingDelay: [
      { guard: "currentPlayerHasNoCards", target: "#cardGame.roundEnd" },
      { guard: "hasMultipleValidCards", target: "selecting" },
      { guard: "hasSingleValidCard", target: "evaluating", actions: "autoPlaySingleCard" },
      { guard: "deckEmpty", target: "#cardGame.roundEnd" },
      { target: "drawing", actions: "drawCard" },  // default
    ],
  },
}
```

**Flow:** State → Guard evaluation → Transition

## Changes Made

### 1. Removed State
- ~~`readyToAct`~~ state deleted
- `checkingCards` now handles decision directly

### 2. Removed Action
```typescript
// ❌ Removed
decideNextAction: raise(({ context }) => ({
  type: Logic.determineNextAction(context),
}))
```

### 3. Removed Internal Events
```typescript
// Before
type InternalEvent =
  | { type: "ROUND_END" }
  | { type: "AUTO_PLAY" }
  | { type: "SELECTING_REQUIRED" }
  | { type: "DRAW_REQUIRED" }
  | { type: "timing.update"; timing: GameContext['timing'] };

// After
type InternalEvent = { type: "timing.update"; timing: GameContext['timing'] };
```

### 4. Added Guards
```typescript
guards: {
  // ...existing guards
  hasMultipleValidCards: ({ context }) => Logic.hasMultipleValidCards(context),
  hasSingleValidCard: ({ context }) => Logic.hasSingleValidCard(context),
  deckEmpty: ({ context }) => Logic.deckEmpty(context),
}
```

### 5. Removed Import
```typescript
// Before
import { setup, assign, raise, sendTo } from "xstate";

// After
import { setup, assign, sendTo } from "xstate";
```

### 6. Updated `determineNextAction`
Added documentation note in `lib/cardGameLogic.ts`:

```typescript
/**
 * Determines the next action for the current player based on game state.
 *
 * NOTE: This function is kept for documentation and testing purposes.
 * The actual machine (cardGameMachine.ts) uses guarded transitions directly
 * in the checkingCards state, not this function. If you update this logic,
 * you must also update the guards in the machine to match.
 *
 * ...
 */
export function determineNextAction(context: GameContext): NextAction {
  // Implementation kept as reference
}
```

## Benefits

### ✅ Simpler State Machine
- **1 state instead of 2** (`checkingCards` vs `checkingCards` + `readyToAct`)
- **No intermediate events** (no `ROUND_END`, `AUTO_PLAY`, etc.)
- **No raise action** (no `decideNextAction`)

### ✅ More Declarative
Decision tree is visible directly in the machine definition:

```typescript
// Can see the entire decision flow at a glance
checkingCards: {
  after: {
    checkingDelay: [
      { guard: "currentPlayerHasNoCards", target: "#cardGame.roundEnd" },
      { guard: "hasMultipleValidCards", target: "selecting" },
      // ... rest of decision tree
    ]
  }
}
```

### ✅ Standard XState Pattern
Guarded transition arrays are the idiomatic way to handle decision points in XState v5.

### ✅ Better Performance
- **No event allocation** for internal events
- **Direct guard evaluation** instead of raise → event → handler chain

### ✅ Easier to Maintain
When you need to change the decision logic, you update guards in one place (the machine definition) instead of:
1. The `determineNextAction` function
2. The `InternalEvent` type
3. The event handlers in `readyToAct`

## Decision Priority (Preserved)

The guard order in `checkingCards` exactly matches the priority from `determineNextAction`:

1. **Win condition** (highest priority): `currentPlayerHasNoCards`
2. **Player choice**: `hasMultipleValidCards`
3. **Auto-play**: `hasSingleValidCard`
4. **Deck exhausted**: `deckEmpty`
5. **Default**: Draw card (fallback when no guards match)

Comments in the machine preserve the rationale for this ordering.

## When to Use `raise` vs Guards

### Use `raise` when:
- Complex orchestration across multiple states
- Need to decouple event generation from handling
- Dynamic event payloads based on runtime calculations
- Event needs to propagate through multiple layers

### Use guarded transitions when:
- Simple decision trees (if/else chains)
- All information needed is in context/event
- Decisions are local to one state
- You want declarative, visible logic

This refactoring chose guards because the decision is a simple if/else chain based on context.

## Testing Notes

The `determineNextAction` function in `lib/cardGameLogic.ts` can still be used for unit testing the decision logic independently, but remember it's **not used by the machine** anymore.

If you want to test the actual machine behavior, test the guards and transitions directly:

```typescript
// Test guards independently
test('hasMultipleValidCards returns true when player has multiple matches', () => {
  const context = createMockContext(/* with multiple matching cards */);
  expect(Logic.hasMultipleValidCards(context)).toBe(true);
});

// Or test the machine transitions
test('checkingCards transitions to selecting when player has choices', () => {
  const machine = cardGameMachine.provide(/* ... */);
  const actor = createActor(machine);
  // ... test transitions
});
```

## Migration Impact

This is a **breaking change** if you were:
- Sending internal events (`ROUND_END`, etc.) manually
- Testing the `decideNextAction` action directly
- Relying on the `readyToAct` state existing

Otherwise, the behavior is **identical** - just implemented more simply.
