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
bun add xstate
bun add @xstate/react

# Note: No build/test commands configured yet - this project is in design phase
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

### XState v5 Requirements

1. **Use `setup()` for TypeScript**:
   - Define types for context and events upfront
   - Register actions, guards, delays in setup block
   - Call `.createMachine()` on the setup result

2. **Actor Model Pattern**:
   - Machine = pure definition (no side effects in machine itself)
   - Actor = running instance created with `createActor(machine).start()`
   - All game state updates via immutable snapshots

3. **Context Management**:
   - Use `assign()` for all context updates
   - Context should include: deck, discard pile, player hands, current player, timer, scores
   - Never mutate context directly

4. **Event-Driven Architecture**:
   - Events: PLAY_CARD, DRAW_CARD, END_TURN, TIMER_TICK, TIMER_EXPIRE, etc.
   - All state changes must be triggered by events
   - Use guards to validate events (e.g., card matches top discard)

5. **React Integration**:
   - Use 'use client' directive for Next.js 16+ components
   - Import `useMachine` from '@xstate/react'
   - Define machines outside components (not inline)
   - Send events for all user interactions, never direct state updates

6. **Async Logic with invoke**:
   - Use `invoke` with `fromPromise` for timer logic
   - Handle `onDone` and `onError` for async operations

7. **Testing**:
   - Pure transitions: `machine.transition(currentState, event)`
   - Actor behavior: `actor.send(event)` then check `actor.getSnapshot()`

## Key Implementation Considerations

### State Design
The machine should model distinct game phases (e.g., SETUP, PLAYER_TURN, CARD_SELECTION, DRAW_PHASE, TIMER_EXPIRED, ROUND_END, GAME_OVER).

### Multi-Card Selection
When a player has multiple valid cards, the state machine must handle:
- Selection state (cards marked as selected)
- Validation that all selected cards match the discard pile top card
- Single action (SPACE key) to play all selected cards atomically

### Timer Management
- 3-minute round timer must be modeled as either:
  - An invoked actor (preferred for XState v5)
  - A delayed transition with periodic TIMER_TICK events
- Timer events should update context with remaining time
- TIMER_EXPIRE event should force round end and score calculation

### Turn Management
- Context must track current player
- END_TURN event triggers player rotation
- Auto-advance if player has no valid moves after draw

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

## Architectural Notes

- This project is currently in the design phase - no implementation exists yet
- All game logic must flow through the state machine (no logic in components)
- Components should be thin wrappers that render snapshots and send events
- State machine should be framework-agnostic (could be used outside React)
- Prefer hierarchy over parallel states unless concerns are truly orthogonal
- Use tags for cross-cutting concerns (e.g., `tags: ['waiting']` for loading states)
