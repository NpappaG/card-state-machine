# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a state machine architecture for a turn-based card game system using XState v5. The game is a timed card-matching game where players alternate placing cards on a shared discard pile, with the goal of achieving the lowest hand value or disposing of all cards before the 3-minute round timer expires.

## Tech Stack

- **State Management**: XState v5 (Actor Model)
- **Runtime**: Bun
- **Framework**: Next.js 16+ (with React)
- **Language**: TypeScript 5+

## Development Commands

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Lint code
bun run lint

# Run all tests
bun test tests

# Run specific test file
bun test tests/cardGameMachine.test.ts
```

## Game Rules

### Setup
- Prompt for player count (2–4)
- Deal 5 cards per player and reveal one more card to start the discard pile
- Randomly select the starting player

### Turn Loop
1. If exactly one card matches the top discard rank, auto-play it.
2. If multiple cards match, enter `selecting` and wait for the user to choose the card(s) to play.
3. If no matches exist, draw one card from the deck and end the turn.

### Scoring
- Ace = 1 point, King = 13 (used when tallying round scores)

### Controls
- **Auto**: Single matching card plays immediately.
- **Manual**: Click to select/deselect cards, press SPACE (or the “Play Selected” button) to commit them.

## State Machine Architecture

The game logic must be modeled using XState v5 following this structure:

### Machine Structure
```
StateMachine
├── Config (parallel: true/false)
├── Context (game data: players, cards, timer, etc.)
├── States (game phases)
├── Events (player actions, timer events)
├── Guards (conditional checks)
├── Transitions (state changes with actions)
└── Actions (entry/exit/transition side effects)
```

### XState v5 Requirements & Best Practices

1. **Use `setup()` for TypeScript** ✅ Implemented:
   - Define types for context and events upfront
   - Register actions, guards, actors in setup block
   - Call `.createMachine()` on the setup result

2. **Actor Model Pattern** ✅ Implemented:
   - Machine = pure definition (no side effects in machine itself)
   - Actor = running instance created with `createActor(machine).start()`
   - All game state updates via immutable snapshots

3. **Pure Immutability** ✅ Implemented:
   - Use `assign()` for ALL context updates
   - Never mutate objects or arrays - create new ones
   - Create objects complete at initialization, don't modify after creation
   - Example: Players created with hands dealt, not dealt then mutated

4. **Event Naming Convention** ✅ Implemented:
   - Use dot notation: `'card.select'`, `'timer.tick'`, `'game.start'`
   - Groups related events logically
   - Modern XState v5 convention (following official examples)

5. **State Targeting**:
   - Use relative names for siblings/children: `target: 'selecting'`
   - Use `#machineId.stateName` for absolute jumps: `target: '#cardGame.roundEnd'`
   - Avoid dot-path strings for targets (only use for `matches()`)

6. **Timing & Performance**:
   - Use `performance.now()` for timers, not `Date.now()`
   - `performance.now()` is monotonic and won't drift with system time changes
   - Critical for accurate game timing

7. **React Integration**:
   - Use 'use client' directive for Next.js 16+ components
   - Import `useMachine` from '@xstate/react'
   - Define machines outside components (not inline)
   - Send events for all user interactions, never direct state updates

8. **Async Logic with invoke** ✅ Implemented:
   - Use `invoke` with `fromCallback` for timer actor
   - Register actors in setup block: `actors: { timer: timerLogic }`
   - Use `always` transitions for continuous condition checking

9. **Testing**:
   - Pure transitions: `machine.transition(currentState, event)`
   - Actor behavior: `actor.send(event)` then check `actor.getSnapshot()`

## Implemented State Machine Flow

### Current State Structure
```
idle
  └─ 'game.start' → setup

setup (entry: initializeGame + startTimer)
  └─ always → roundActive

roundActive (invoke timer, always guard timerExpired → roundEnd)
  └─ playerTurn
        checkingCards
          ├─ no cards → roundEnd
          ├─ multiple matches → selecting
          ├─ single match → evaluating (auto)
          └─ no matches → drawing
        selecting
          └─ 'card.play' (guard: canPlaySelectedCards) → evaluating
        drawing (entry: drawCard) → evaluating
        evaluating
          ├─ player empty → roundEnd
          └─ changeTurn
        changeTurn (entry: advanceTurn) → checkingCards

roundEnd (entry: calculateScores, type: final)
```

### Key Features
- **Auto-play singles**: One matching card plays instantly.
- **Manual matches**: Multiple matches drop into `selecting`.
- **Draw-and-go**: No matches trigger a draw, then evaluation immediately.
- **Timer guard**: `roundActive` continuously checks the round timer.

### Events Used
```typescript
'game.start'      // Start new game with player count
'card.select'     // Mark card as selected (in selecting state)
'card.deselect'   // Unmark card (in selecting state)
'card.play'       // Play all selected cards (in selecting state)
'timer.tick'      // Internal: Timer actor sends every second
```

### Context Structure
```typescript
{
  players: Player[],           // 2-4 players with five-card hands
  currentPlayerIndex: number,  // Active player
  deck: Card[],                // Remaining cards
  discardPile: Card[],         // Played cards (top = last)
  selectedCards: Card[],       // Cards marked for play
  timerStartMs: number,        // performance.now() when started
  timerRemainingMs: number,    // Milliseconds left (180000 = 3 min)
  roundScores: Record<string, number>  // Final scores
}
```

## Documentation References

See `/docs/XSTATE_DOCS.md` for compressed XState v5 reference including:
- Core API (`createMachine`, `createActor`, `assign`, `setup`)
- Event handling and transitions
- Guards and actions
- Hierarchical and parallel states
- Actor model and communication
- TypeScript integration
- React/Next.js patterns
- Testing strategies

## State Machine Design Template

When implementing states, follow this structure (from README.md):

```
STATE_NAME
├── Description: Brief summary of this state
├── Valid Events: List of events this state can handle
├── Entry Actions: Side effects on entering
├── Exit Actions: Side effects on exiting
└── Transitions:
    └── Event -> Target State (with guards if conditional)
```

For events, document:
```
EVENT_NAME
├── Trigger: What causes this event
└── Data: Payload structure
```

For guards:
```
guardName()
└── Purpose: Conditional check with context params referenced
```

## Project Structure

```
card-state-machine/
├── machines/              # XState v5 state machines (framework-agnostic)
│   ├── cardGameMachine.ts # Main game state machine
│   └── [future]           # Extract timer machine here if needed
├── lib/                   # Next.js/React specific code
│   ├── types.ts          # Shared TypeScript types (Card, Player, Context, Events)
│   └── [future]          # React hooks, utilities, components
├── app/                   # Next.js 16+ app router pages
├── docs/                  # Documentation
│   ├── CLAUDE.md         # This file
│   ├── XSTATE_DOCS.md    # XState v5 reference
│   └── example*.ts       # Example state machines for reference
└── public/               # Static assets
```

## Implementation Status

### ✅ Completed
- **State Machine**: Fully implemented with all game logic
  - Setup phase: Deal 5 cards per player, 1 to discard pile, random first player
  - Turn flow: checkingCards → readyToAct → selecting/auto-play/drawing → evaluating → changingTurn
  - Timer: 3-minute countdown with `fromCallback` actor
  - Win conditions: Empty hand, timer expires, or deck exhausted
  - Score calculation at round end
- **Type Safety**: Complete TypeScript types for all entities
- **Pure Actions**: All context updates are immutable via pure functions in `lib/cardGameLogic.ts`
- **Modern Conventions**: Dot notation events, `performance.now()` timing
- **UI Components**: Fully implemented React components with Framer Motion animations
- **Hooks**: `useCardGame` hook provides state matchers and convenience methods
- **Visual Polish**: Complete with card animations, state visualizer, and speed controls
- **Dynamic Timing**: Runtime-adjustable delays via SpeedControls (slow/normal/fast)

## Architectural Principles

- All game logic flows through the state machine (no logic in components)
- Components are thin wrappers that render snapshots and send events
- State machine is framework-agnostic (could be used outside React)
- Hierarchy over parallel states (unless concerns are truly orthogonal)
- Single source of truth: Context holds all game state
- Turn transitions are explicit with `changingTurn` state (for animation window)

## Timing Architecture: The Critical Design Decision

**Core Principle:** The state machine is the clock. Animations are subordinate to state machine delays, not the other way around.

All timing is defined in `/lib/constants.ts` via `GAME_TIMING`. State machine delays (`after: { ... }`) create fixed time windows, and UI animations must fit within those windows. This is **time-based coordination** rather than event-driven coordination.

### Why This Approach

- **Simple and maintainable** - No complex animation event plumbing
- **Deterministic timing** - Predictable, testable behavior
- **Clean separation** - State machine doesn't depend on UI layer
- **Good fit for games** - Fixed-duration animations are acceptable

### How It Works

State machine delays define state duration:
```typescript
checkingCards: {
  after: {
    checkingDelay: "readyToAct",  // Uses context.timing.CHECKING_DELAY
  }
}
```

Animations calculate proportional keyframes:
```typescript
const totalDuration = GAME_TIMING.CHECKING_DELAY; // 1000ms
const liftDuration = 400;   // Fixed phase
const liftEnd = liftDuration / totalDuration;  // 0.4 (40%)

// If CHECKING_DELAY changes to 2000ms, liftEnd becomes 0.2 (20%)
```

See `/lib/animations/cardAnimations.ts` for implementation examples.

### Dynamic Timing System

The app includes `SpeedControls` that allow runtime adjustment:
- **Slow**: All delays × 2
- **Normal**: Default `GAME_TIMING` values
- **Fast**: All delays × 0.5

**Flow:** SpeedControls → TimingContext → useCardGame (useEffect) → state machine context

Timing values flow through React Context and sync to the state machine via `timing.update` event.

### Known Trade-off: Topline Delay

The `checkingCards` state has a 1000ms delay that applies to ALL branches:
- **Auto-play:** ✅ Needs the delay for amber highlight animation
- **Manual selection:** ⚠️ Adds pause before user can click
- **Drawing:** ⚠️ Adds pause before draw animation

**Why it's acceptable:**
- Simplifies state machine structure
- Round timer continues (adds time pressure)
- Auto-play animation has predictable window

**Potential optimization:** Move delay into `autoPlaying` sub-state for more responsive manual actions.

### Alternative Approaches NOT Used

1. **Event-driven animations** (animations send `ANIMATION_COMPLETE` events)
   - More complex
   - Couples UI to state machine
   - Allows variable-duration animations

2. **Invoked animation actors** (XState owns animation lifecycle)
   - Tighter coupling
   - More plumbing required

Current approach is simpler and sufficient for this use case.

## File Organization

```
/machines/
  cardGameMachine.ts   - State machine definition (setup, states, transitions)
  timerMachine.ts      - Round timer actor machine

/lib/
  cardGameLogic.ts     - Pure game logic functions (guards, reducers)
  timerHelpers.ts      - Timer actor helper functions
  constants.ts         - GAME_TIMING and other constants
  types.ts             - TypeScript types (Card, Player, GameContext, GameEvent)
  /hooks/
    useCardGame.ts     - Primary hook for accessing game state
    useAnimations.ts   - Animation timing helpers
  /contexts/
    TimingContext.tsx  - React Context for dynamic timing configuration
  /animations/
    cardAnimations.ts  - Framer Motion animation builders (proportional timing)
  /utils/
    scoreCalculator.ts - Pure scoring logic

/app/
  page.tsx             - Main game page
  layout.tsx           - Root layout with TimingProvider
  /components/
    StateTreeVisualizer.tsx - Visual state machine debugger
    SpeedControls.tsx       - Runtime timing controls
    /card/                  - Card display components
    /deck/                  - Deck stack component
    /discard/               - Discard pile component

/tests/
  cardGameMachine.test.ts - State machine integration tests
  cardGameLogic.test.ts   - Pure logic unit tests

/docs/
  CLAUDE.md           - This file
  XSTATE_DOCS.md      - XState v5 reference
  ARCHITECTURE.md     - Detailed architecture decisions
  XSTATE_PATTERNS.md  - Common XState patterns
```

## Common Development Patterns

### Adding a New State

1. Update state machine in `machines/cardGameMachine.ts`
2. Add pure logic functions to `lib/cardGameLogic.ts` if needed
3. Export state matcher from `useCardGame.ts`:
   ```typescript
   isNewState: snapshot.matches({ roundActive: { playerTurn: 'newState' } })
   ```
4. Use matcher in components for conditional rendering

### Adding a New Event

1. Add event type to `GameEvent` in `lib/types.ts`
2. Add event handler in appropriate state in `machines/cardGameMachine.ts`
3. Components send event via `send({ type: 'event.name', ...payload })`

### Modifying Timing

1. Update `GAME_TIMING` in `lib/constants.ts`
2. Ensure animations in `lib/animations/cardAnimations.ts` fit within new window
3. Test with SpeedControls UI at slow/normal/fast speeds

### Animation Best Practices

- Animations must complete BEFORE their state's delay expires
- Use proportional timing math (calculate keyframes from `GAME_TIMING`)
- Never hardcode animation durations that don't reference `GAME_TIMING`
- Test at all speed settings using SpeedControls

### Testing Pure Logic

```typescript
import * as Logic from '@/lib/cardGameLogic';

test('should allow playing matching card', () => {
  const context = createMockContext({ /* ... */ });
  expect(Logic.canPlaySelectedCards(context)).toBe(true);
});
```

### Testing State Machine

```typescript
import { createActor } from 'xstate';
import { cardGameMachine } from '@/machines/cardGameMachine';

test('should transition to selecting when multiple cards match', async () => {
  const actor = createActor(cardGameMachine).start();
  actor.send({ type: 'game.start', playerCount: 2 });
  await waitFor(actor, (state) =>
    state.matches({ roundActive: { playerTurn: 'selecting' } })
  );
  expect(actor.getSnapshot().context.players[0].hand).toHaveLength(5);
});
```
