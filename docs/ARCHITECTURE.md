# Architecture Documentation

## State Machine Pacing Solution

### The Problem: Auto-Play Cascade

Without any delays, the XState v5 `always` transitions fire synchronously, causing the game to cascade through multiple states in milliseconds:

```
checkingCards → drawing → evaluating → changingTurn → checkingCards → ...
```

In testing, this resulted in **25 cards being auto-played in 12.5 seconds** before a single UI frame could render. The game was technically correct but completely unplayable.

### Solutions Considered

We evaluated three approaches:

#### Option A: Event-Driven (Pure)
**Approach**: Replace `always` transitions with explicit events (`turn.ready`, `autoPlay.done`, etc.) sent by UI after animations complete.

**Pros**:
- Maintains pure state machine (no time-based logic)
- UI controls pacing completely
- Most flexible

**Cons**:
- Major refactoring of machine structure
- Complex coordination between machine and React
- Animations must be carefully orchestrated
- Higher cognitive load

#### Option B: Pragmatic Delays (Chosen)
**Approach**: Wrap `always` transitions in `after: { DELAY: ... }` blocks with centralized timing constants.

**Pros**:
- Simple to implement and reason about
- State machine enforces consistent timing
- Minimal code changes
- Works immediately

**Cons**:
- Slight "impurity" (time-based logic in machine)
- Fixed timing (less flexible than event-driven)

#### Option C: Faster Animations
**Approach**: Keep instant transitions, just make animations super fast.

**Cons**:
- Doesn't solve the problem (still too fast)
- Poor UX (players can't follow gameplay)
- Not a real solution

### Decision: Pragmatic Delays (Option B)

We chose **Option B** because:
1. **Simplicity**: Minimal code changes, easy to understand
2. **Immediate results**: Works out of the box
3. **Centralized control**: All timing in `lib/constants.ts`
4. **Good enough**: The slight impurity is worth the massive UX improvement

The timing constants live in `lib/constants.ts`:
```typescript
export const GAME_TIMING = {
  CHECKING_DELAY: 300,        // Before checking playable cards
  AUTO_PLAY_DELAY: 600,       // After auto-playing card
  DRAW_DELAY: 500,            // After drawing card
  EVALUATING_DELAY: 400,      // Before evaluating win conditions
  TURN_CHANGE_DELAY: 500,     // During turn transition
  ROUND_DURATION_MS: 180000,  // 3-minute round timer
} as const;
```

### How It Works

#### Before (Instant Cascade)
```typescript
checkingCards: {
  always: [  // Fires instantly!
    { guard: 'hasSingleValidCard', target: 'evaluating', actions: 'autoPlaySingleCard' },
    // ...
  ],
},
```

**Result**: Cascades through all states in one event loop tick.

#### After (Observable States)
```typescript
checkingCards: {
  after: {
    [GAME_TIMING.CHECKING_DELAY]: {  // Waits 300ms
      always: [
        { guard: 'hasSingleValidCard', target: 'evaluating', actions: 'autoPlaySingleCard' },
        // ...
      ],
    },
  },
},
```

**Result**: Each state is observable for its delay duration. Animations have time to play.

### State Flow with Delays

```
Player plays card
    ↓
selecting → evaluating (waits 400ms)
    ↓
changingTurn (waits 500ms)
    ↓
checkingCards (waits 300ms)
    ↓
[auto-play detected]
    ↓
evaluating (waits 400ms, card flies to discard)
    ↓
changingTurn (waits 500ms)
    ↓
checkingCards (next player)
```

**Total time for one auto-play**: ~1.6 seconds (vs. instant before).

### Animation Coordination

UI animations should match or be **shorter** than these delays:

```typescript
// In Framer Motion components
<motion.div
  animate={{ ... }}
  transition={{ duration: 0.5 }}  // Matches or is shorter than EVALUATING_DELAY (400ms)
/>
```

If animations take longer than delays, they'll get cut off. If they're shorter, there's a brief pause (acceptable).

### Testing with Delays

Tests now observe intermediate states that were previously invisible:

```typescript
// Before delays: would instantly cascade to changingTurn
actor.send({ type: 'card.play' });
expect(snapshot.matches('evaluating')).toBe(true);  // NOW passes!
```

See `tests/cardGameMachine.test.ts` for timing behavior tests.

### Future Considerations

If we need more flexibility (e.g., user-configurable animation speed, accessibility options for reduced motion), we could:

1. **Make constants configurable**: Export timing presets (slow, normal, fast)
2. **Hybrid approach**: Use delays for most transitions, events for critical ones
3. **Full event-driven**: Refactor to Option A if complexity is justified

For now, **pragmatic delays are the right balance** of simplicity and UX quality.

---

## XState v5 Architecture

### Key Concepts

#### Machine vs. Actor vs. Snapshot

- **Machine**: Blueprint/definition (lives in `machines/cardGameMachine.ts`)
  - Defines states, events, transitions, actions, guards
  - Pure and reusable (no instance state)
  - Created with `setup().createMachine()`

- **Actor**: Running instance of a machine
  - Created with `createActor(machine).start()`
  - Has its own context (game state)
  - Responds to events via `.send()`

- **Snapshot**: Immutable point-in-time state
  - Retrieved with `actor.getSnapshot()`
  - Contains `.value` (current state), `.context` (game data), `.matches()` (state checking)
  - Used in React components and tests

```typescript
// Machine (blueprint)
export const cardGameMachine = setup({...}).createMachine({...});

// Actor (running instance)
const actor = createActor(cardGameMachine).start();

// Snapshot (current state)
const snapshot = actor.getSnapshot();
console.log(snapshot.value); // 'roundActive.playerTurn.checkingCards'
```

#### Pure Functions vs. Machine Wiring

**Logic lives in `machines/cardGameLogic.ts`:**
```typescript
// Pure, testable functions
export function canPlaySelectedCards(context: GameContext): boolean {
  // Decision logic
}

export function playSelectedCardsReducer(context: GameContext): GameContext {
  // Immutable state update
  return { ...context, ... };
}
```

**Machine wires them together:**
```typescript
guards: {
  canPlaySelectedCards: ({ context }) => Logic.canPlaySelectedCards(context),
},
actions: {
  playSelectedCards: assign(({ context }) => Logic.playSelectedCardsReducer(context)),
},
```

**Why?**
- Guards and actions are testable in isolation
- Machine file stays clean and declarative
- Logic can be reused or refactored independently

#### Event Naming Convention

Use **dot notation** (XState v5 convention):
```typescript
'game.start'      // Start new game
'card.select'     // Select card
'card.play'       // Play selected cards
'timer.tick'      // Timer update (internal)
```

Groups related events logically and follows modern XState v5 examples.

#### Immutability with `assign()`

**All context updates must use `assign()` and return new objects:**

```typescript
// ✅ Correct - returns new object
playSelectedCards: assign(({ context }) => ({
  ...context,
  players: context.players.map(p => ({ ...p, hand: [...p.hand] })),
  discardPile: [...context.discardPile, ...context.selectedCards],
  selectedCards: [],
})),

// ❌ Wrong - mutates context
playSelectedCards: assign(({ context }) => {
  context.selectedCards = [];  // MUTATION!
  return context;
}),
```

All action reducers in `cardGameLogic.ts` are tested for immutability.

### State Machine Structure

```
idle
  └─ 'game.start' → setup

setup (entry: initializeGame, startTimer)
  └─ always → roundActive

roundActive (invoke: timer actor, always guard: timerExpired → roundEnd)
  └─ playerTurn (initial: checkingCards)
        ├─ checkingCards (after 300ms)
        │     ├─ no cards → roundEnd
        │     ├─ multiple matches → selecting
        │     ├─ single match → evaluating (auto-play)
        │     └─ no matches → drawing
        ├─ selecting
        │     └─ 'card.play' (guard: valid) → evaluating
        ├─ drawing (entry: drawCard, after 500ms → evaluating)
        ├─ evaluating (after 400ms)
        │     ├─ player empty → roundEnd
        │     └─ else → changingTurn
        └─ changingTurn (entry: advanceTurn, after 500ms → checkingCards)

roundEnd (entry: calculateScores, type: final)
```

### Timer Actor

Uses `fromCallback` for the 3-minute round timer:

```typescript
const timerLogic = fromCallback(({ sendBack }) => {
  const interval = setInterval(() => {
    sendBack({ type: 'timer.tick' });
  }, 1000);
  return () => clearInterval(interval);
});
```

- Sends `timer.tick` every second
- Machine updates `timerRemainingMs` on each tick
- `always` guard checks `timerExpired` to end round

### React Integration

```typescript
import { useMachine } from '@xstate/react';
import { cardGameMachine } from '@/machines/cardGameMachine';

function GameComponent() {
  const [snapshot, send] = useMachine(cardGameMachine);

  // Access state
  const isSelecting = snapshot.matches({ roundActive: { playerTurn: 'selecting' } });

  // Send events
  const handleCardClick = (cardId: string) => {
    send({ type: 'card.select', cardId });
  };

  return <div>...</div>;
}
```

**Key Principles**:
- Machine lives outside components (defined at module level)
- Components are thin wrappers that render snapshots and send events
- All game logic flows through the state machine (no logic in components)

---

## Project Structure

```
card-state-machine/
├── machines/
│   ├── cardGameMachine.ts      # State machine definition
│   └── cardGameLogic.ts        # Pure guards/actions
├── lib/
│   ├── types.ts                # TypeScript types
│   ├── constants.ts            # Timing constants
│   └── hooks/                  # React hooks (future)
├── app/                        # Next.js 16+ pages
├── tests/
│   ├── cardGameLogic.test.ts   # Guard/action tests (70 tests)
│   └── cardGameMachine.test.ts # State transition tests (8 tests)
└── docs/
    ├── CLAUDE.md               # Project overview
    ├── ARCHITECTURE.md         # This file
    └── XSTATE_DOCS.md          # XState v5 reference
```

---

## Design Principles

1. **Single Source of Truth**: All game state in machine context
2. **Framework-Agnostic Machine**: Could be used outside React
3. **Pure Logic**: Extract testable functions from machine wiring
4. **Hierarchy Over Parallel**: Use nested states unless concerns are orthogonal
5. **Explicit Transitions**: `changingTurn` state creates animation window
6. **Centralized Timing**: All delays in one constants file
7. **Immutability**: All context updates create new objects
8. **Event-Driven UI**: Components never mutate state directly

---

## Performance Notes

- **Timing Overhead**: Delays add ~1.6s per turn cycle (acceptable for turn-based game)
- **Memory**: Machine definition is shared; each actor has its own context
- **Re-renders**: React components re-render on every snapshot update (fine with proper memoization)

Use `React.memo()` and `useMemo()` for expensive rendering if needed.

---

## Testing Strategy

See `docs/TESTING.md` (created in Phase 6) for comprehensive testing documentation.

**Summary**:
- **Unit tests**: Guards and actions (pure functions)
- **Integration tests**: State transitions with delays
- **E2E tests**: Full game flows (future)

**Current Coverage**: 78 tests, 142 assertions
