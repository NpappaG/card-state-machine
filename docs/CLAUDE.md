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
# Install dependencies (already installed)
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Lint code
bun run lint
```

## Game Rules

### Scoring
- Ace = 1 point
- Number cards (2-10) = Face value
- Jack = 11, Queen = 12, King = 13

### Core Mechanic
Players can only play cards that match the value of the top discard card (7 on 7, Queen on Queen). If no match exists, player must draw from the deck.

### Controls
- **Single valid card**: Auto-play
- **Multiple valid cards**: Click to select/deselect, SPACE key to play selected cards together

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
  └─ on 'game.start' → setup

setup (entry: initializeGame, startTimer)
  └─ always → roundActive

roundActive (invoke: timer, always check: timerExpired → roundEnd)
  └─ playerTurn
      └─ checkingCards (entry point each turn)
          ├─ No cards? → roundEnd (player wins!)
          ├─ Multiple valid cards? → selecting
          ├─ Single valid card? → evaluating (auto-play)
          └─ No valid cards? → drawing

      └─ selecting (user choosing cards)
          ├─ on 'card.select' → add to selection
          ├─ on 'card.deselect' → remove from selection
          └─ on 'card.play' (guard: valid) → evaluating

      └─ drawing (forced draw)
          └─ entry: drawCard → always → evaluating

      └─ evaluating (check win conditions)
          ├─ Player has no cards? → roundEnd
          └─ else → changingTurn

      └─ changingTurn (entry: advanceTurn, after: 500ms)
          └─ after 500ms → checkingCards (next player)

roundEnd (entry: calculateScores, type: final)
```

### Key Features
- **Auto-play**: Single valid card plays automatically (no user input needed)
- **Multi-select**: Multiple valid cards require user selection
- **Turn animation**: 500ms window in `changingTurn` state for UI transitions
- **Always guard**: Timer checked continuously at `roundActive` level (works in any substate)
- **Pure flow**: All transitions driven by guards, no manual event sending needed

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
  players: Player[],           // 2-8 players with hands
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
  - Setup phase: Deal 3 cards per player, 1 to discard pile, random first player
  - Turn flow: checkingCards → selecting/auto-play/drawing → evaluating → changingTurn
  - Timer: 3-minute countdown with `fromCallback` actor
  - Win conditions: Empty hand or timer expires
  - Score calculation at round end
- **Type Safety**: Complete TypeScript types for all entities
- **Pure Actions**: All context updates are immutable
- **Modern Conventions**: Dot notation events, `performance.now()` timing

### 🚧 In Progress / Next Steps
- **UI Components**: Build React components to visualize and play the game
- **Hooks**: Create `useCardGame` hook to connect machine to React
- **Visual Polish**: Animations, transitions, responsive design

## Architectural Principles

- All game logic flows through the state machine (no logic in components)
- Components are thin wrappers that render snapshots and send events
- State machine is framework-agnostic (could be used outside React)
- Hierarchy over parallel states (unless concerns are truly orthogonal)
- Single source of truth: Context holds all game state
- Turn transitions are explicit with `changingTurn` state (for animation window)
