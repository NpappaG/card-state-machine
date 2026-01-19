# Guard-Based Decision Pattern (Current)

## Document Purpose

This document describes the current guard-based decision pattern used in the XState v5 card game machine. It is a reference for how we structure decision routing with delayed transitions and guards.

**Target Audience:** Maintainers working on game logic or state machine architecture.

---

## Table of Contents

1. Background & Context
2. Current Pattern Details
3. Decision Routing with Guards
4. Testing Notes

---

## Background & Context

### Project Overview

We're building a turn-based card game using XState v5. The game involves:
- Multiple players taking turns
- Card matching rules (play cards that match the top discard pile rank)
- Automatic gameplay when only one valid card exists
- Manual card selection when multiple valid cards exist
- Drawing from deck when no matches exist
- 3-minute round timer with pause/resume
- UI animations synchronized with state transitions

### Why This Pattern Matters

We use guard-based decision routing to keep the machine declarative and maintainable:
1. Use delayed transitions with guard arrays for decision points
2. Guards evaluate game state and route to appropriate next states
3. Eliminates need for intermediate states and internal events
4. Keep context updates pure and in `lib/cardGameLogic.ts`

### Previous Evolution (Summary)

- **Phase 1**: Guard arrays inside after for all routing (initial implementation)
- **Phase 2**: `raise()` pattern with `readyToAct` state and internal events (over-engineered)
- **Phase 3** (Current): Collapsed back to guard-based routing (simpler, more declarative)

---

## Current Pattern Details

### File Structure

```
machines/
  cardGameMachine.ts     # State machine definition
  timerMachine.ts        # Separate timer actor
lib/
  cardGameLogic.ts       # Pure game logic functions
  timerHelpers.ts        # Helper functions to read timer state
  types.ts               # Type definitions
  constants.ts           # Timing configuration
  hooks/useCardGame.ts   # React integration hook
tests/
  cardGameMachine.test.ts  # Integration tests
  cardGameLogic.test.ts    # Unit tests
```

### Current State Machine Structure

```
setup
  └─ game.start → roundActive + initializeGame

roundActive (invoke timer actor)
  ├─ playing
  │   ├─ playerTurn
  │   │   ├─ checkingCards
  │   │   │   └─ after CHECKING_DELAY + guard array → [selecting | evaluating | drawing | roundEnd]
  │   │   ├─ selecting
  │   │   │   ├─ card.select → selectCard
  │   │   │   ├─ card.deselect → deselectCard
  │   │   │   └─ card.play [canPlaySelectedCards] → evaluating + playSelectedCards
  │   │   ├─ drawing
  │   │   │   └─ after DRAW_DELAY → evaluating
  │   │   ├─ evaluating
  │   │   │   └─ after EVALUATING_DELAY + guard array → [roundEnd | changingTurn]
  │   │   └─ changingTurn
  │   │       └─ after TURN_CHANGE_DELAY → checkingCards
  │   ├─ hist (history state for pause/resume)
  │   └─ round.pause → paused
  └─ paused
      └─ round.resume → hist

roundEnd
  ├─ entry: calculateScores
  ├─ game.newRound → roundActive
  └─ game.over → setup
```

### Event Types Inventory

**External events (from UI or system):**
- `game.start` - Start new game with player configuration
- `game.newRound` - Restart with same players, new deck
- `game.over` - End game, return to setup
- `card.select` - Mark card as selected
- `card.deselect` - Unmark card
- `card.play` - Play selected cards
- `round.pause` - Pause game and timer
- `round.resume` - Resume from paused state
- `timer.expired` - Sent by timer actor when time runs out
- `timing.update` - Update timing configuration

**No internal events** - All routing happens via guards on delayed transitions.

### Actions Inventory

**Setup and state management:**
- `initializeGame` - Deal cards, set up players, initialize context
- `restartRound` - Reset for new round with same players
- `resetGame` - Full reset to setup state

**Card actions:**
- `selectCard` - Add card to selected cards array
- `deselectCard` - Remove card from selected cards array
- `playSelectedCards` - Move selected cards to discard pile
- `autoPlaySingleCard` - Auto-play when only one valid card exists
- `drawCard` - Draw from deck when no matches
- `advanceTurn` - Move to next player

**Timer communication:**
- `forwardPauseToTimer` - Send pause event to timer actor
- `forwardResumeToTimer` - Send resume event to timer actor

**Scoring:**
- `calculateScores` - Tally final scores at round end
- `updateTimingConfig` - Update dynamic timing configuration

### Guards Inventory

**Card validation:**
- `canPlaySelectedCards` - All selected cards match top discard rank

**Win conditions:**
- `currentPlayerHasNoCards` - Player's hand is empty (win condition)

**Decision routing:**
- `hasMultipleValidCards` - Player has 2+ cards matching top discard
- `hasSingleValidCard` - Player has exactly 1 card matching top discard
- `deckEmpty` - No cards left to draw (stalemate condition)

**Note:** These guards are implemented as pure functions in `lib/cardGameLogic.ts` and wired to the machine via the `guards` configuration.

---

## Decision Routing with Guards

### Design Principles

1. **Declarative routing** - Guards express intent clearly
   ```typescript
   after: {
     checkingDelay: [
       { guard: 'hasMultipleValidCards', target: 'selecting' },
       { guard: 'hasSingleValidCard', target: 'evaluating', actions: 'autoPlaySingleCard' },
       { guard: 'deckEmpty', target: '#cardGame.roundEnd' },
       { target: 'drawing', actions: 'drawCard' },
     ]
   }
   ```

2. **Guard ordering matters** - Guards are checked in order, first match wins
   - Check complex conditions before simple ones
   - Check win conditions before continuing play
   - Always provide a default fallback (last entry with no guard)

3. **Deterministic timing** - Delays create observable states for animations
   - `CHECKING_DELAY` (1000ms): Buffer before any action
   - `DRAW_DELAY` (1155ms): Card draw animation window
   - `EVALUATING_DELAY` (400ms): Card discard animation window
   - `TURN_CHANGE_DELAY` (400ms): Player highlight transition

4. **Pure guard functions** - All logic extracted to `lib/cardGameLogic.ts`
   ```typescript
   // In lib/cardGameLogic.ts
   export function hasMultipleValidCards(context: GameContext): boolean {
     const validCards = getValidCards(context);
     return validCards.length > 1;
   }

   // In cardGameMachine.ts
   guards: {
     hasMultipleValidCards: ({ context }) => Logic.hasMultipleValidCards(context),
   }
   ```

5. **Single responsibility** - Actions update context OR trigger side effects, not both
   - State updates: `assign()` with pure reducers
   - Communication: `sendTo()` for actor messages
   - Never mix routing logic into actions

### Pattern Example: checkingCards Decision Hub

The `checkingCards` state is the main decision point in the game loop:

```typescript
checkingCards: {
  after: {
    checkingDelay: [
      // 1. Multiple valid cards → let player choose
      {
        guard: 'hasMultipleValidCards',
        target: 'selecting',
      },
      // 2. Single valid card → auto-play
      {
        guard: 'hasSingleValidCard',
        target: 'evaluating',
        actions: 'autoPlaySingleCard',
      },
      // 3. Deck exhausted → end round (prevents infinite loop)
      {
        guard: 'deckEmpty',
        target: '#cardGame.roundEnd',
      },
      // 4. Default → must draw
      {
        target: 'drawing',
        actions: 'drawCard',
      },
    ],
  },
},
```

**Why this ordering?**
- Check multiple before single to prevent auto-playing when player should choose
- Check deck empty before drawing to prevent errors
- Default to drawing when no matches and deck has cards

### Pattern Benefits

1. **Readability** - State machine reads like a decision tree
2. **Maintainability** - Add/remove/reorder guards without restructuring states
3. **Testability** - Guards are pure functions, easily unit tested
4. **Simplicity** - No intermediate states or internal events needed
5. **Performance** - Guards evaluated once per transition, not continuously

### Pattern Trade-offs

**Advantages over raise() pattern:**
- Fewer states (no `readyToAct` intermediate state)
- No internal events to track
- More declarative (intent clear from guard names)
- Simpler mental model

**Disadvantages:**
- Guard order matters (must be documented)
- Default case must always be last
- Can't easily see "why" a route was taken in visualizer (guard names only)

---

## Timer Actor Integration

The timer is a separate invoked machine that owns all timer state:

```typescript
roundActive: {
  invoke: {
    id: 'timer',
    src: 'timer',
    syncSnapshot: true,  // Ensures timer state is immediately available
    input: ({ context, event }) => ({
      durationMs: context.timing.ROUND_DURATION_MS,
      startMs: getRoundStartMs(event),
      tickIntervalMs: 1000,
    }),
  },
  on: {
    'timer.expired': {
      target: 'roundEnd',
    },
  },
}
```

**Key points:**
- `syncSnapshot: true` makes timer state immediately readable
- Game machine forwards pause/resume events to timer via `sendTo()`
- Timer sends `timer.expired` event when time runs out
- React uses `useSelector()` to subscribe to timer updates

---

## Testing Notes

### Unit Tests (cardGameLogic.test.ts)

Test pure guard and reducer functions in isolation:

```typescript
import * as Logic from '@/lib/cardGameLogic';

test('hasMultipleValidCards returns true when 2+ cards match', () => {
  const context = makeContext({
    players: [makePlayer([makeCard('Q'), makeCard('Q', 'spades')])],
    discardPile: [makeCard('Q', 'hearts')],
  });
  expect(Logic.hasMultipleValidCards(context)).toBe(true);
});
```

### Integration Tests (cardGameMachine.test.ts)

Test state transitions and timing behavior:

```typescript
test('checkingCards routes to selecting when multiple cards match', () => {
  const actor = buildActor(
    { roundActive: { playing: { playerTurn: 'checkingCards' } } },
    {
      players: [makePlayer([makeCard('7'), makeCard('7', 'spades')])],
      discardPile: [makeCard('7', 'hearts')],
    }
  );

  const snapshot = actor.getSnapshot();
  actor.stop();

  // Should be in checkingCards initially (waiting for CHECKING_DELAY)
  expect(snapshot.matches({ roundActive: { playing: { playerTurn: 'checkingCards' } } })).toBe(true);

  // After delay (tested separately), should route to selecting
});
```

### Timing Configuration

Tests use the same timing constants as production via `context.timing`. To test faster, update context:

```typescript
const fastContext = {
  ...context,
  timing: {
    CHECKING_DELAY: 100,
    DRAW_DELAY: 100,
    EVALUATING_DELAY: 100,
    TURN_CHANGE_DELAY: 100,
    ROUND_DURATION_MS: 10000,
  },
};
```

---

## Comparison: raise() vs Guards

### Previous Pattern (Removed)

```typescript
checkingCards: {
  after: {
    checkingDelay: 'readyToAct',
  },
},
readyToAct: {
  entry: 'decideNextAction',  // Raises internal events
  on: {
    ROUND_END: '#cardGame.roundEnd',
    AUTO_PLAY: { target: 'evaluating', actions: 'autoPlaySingleCard' },
    SELECTING_REQUIRED: 'selecting',
    DRAW_REQUIRED: 'drawing',
  },
},
```

**Issues:**
- Extra state (`readyToAct`)
- Internal events (`ROUND_END`, `AUTO_PLAY`, etc.)
- Action that raises events (`decideNextAction`)
- More ceremony for same functionality

### Current Pattern

```typescript
checkingCards: {
  after: {
    checkingDelay: [
      { guard: 'hasMultipleValidCards', target: 'selecting' },
      { guard: 'hasSingleValidCard', target: 'evaluating', actions: 'autoPlaySingleCard' },
      { guard: 'deckEmpty', target: '#cardGame.roundEnd' },
      { target: 'drawing', actions: 'drawCard' },
    ],
  },
},
```

**Benefits:**
- One state instead of two
- No internal events
- Guards express intent clearly
- Decision logic is declarative
- Fewer lines of code

---

## Future Considerations

If the decision tree grows more complex (e.g., 10+ guards), consider:

1. **Hierarchical states** - Group related decisions
2. **Parallel regions** - If decisions are orthogonal
3. **Actor spawning** - For complex conditional logic

For now, guard arrays handle all decision routing simply and effectively.
