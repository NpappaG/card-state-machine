# card-state-machine

A state machine architecture for a turn-based card game system using XState v5.

## Status

✅ **State Machine Complete** - Fully implemented game logic in `machines/cardGameMachine.ts`
🚧 **UI In Progress** - React components to be built next

## Overview

This project implements a turn-based card matching game where 2-4 players race to empty their hands (or finish with the lowest score) before a 3-minute timer expires.

## Game Mechanics

Achieve the lowest total hand value or dispose of all your cards before the 3-minute round timer expires.

### Scoring System

- Ace = 1 point
- Number cards (2-10) = Face value
- Jack = 11 points
- Queen = 12 points
- King = 13 points

### Deck

Standard 52-card deck:
- **Suits**: Hearts, Diamonds, Clubs, Spades (4 suits)
- **Ranks**: Ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, Jack, Queen, King (13 ranks per suit)
- **Total Cards**: 52 cards

### Game Setup

- **Players**: 2–4 (prompted at start)
- **Initial Deal**: Each player receives 5 cards
- **Starting Card**: One additional card is revealed to seed the discard pile
- **First Player**: Randomly selected
- **Timer**: Optional 3-minute round timer limits play

### Turn Loop

1. **Auto-play** – If the active player has exactly one card that matches the rank of the top discard card, it is played automatically.
2. **Selecting** – If multiple cards match the top discard rank, the player can select/deselect those cards and press SPACE/“Play Selected” to place one (or several) on the discard pile.
3. **Drawing** – If no matching cards exist, the player draws one card from the deck. Play immediately advances to the next player.

This loop repeats in player order until a hand empties or the timer expires.

### Controls

- Click a card to select/deselect it when the machine is in the `selecting` state.
- Press SPACE (or the “Play Selected” button) to confirm the selection.
- Auto-play runs without input whenever only one valid card exists.

### State Chart Outline

```
idle
  └─ 'game.start' → setup

setup (entry: initializeGame + startTimer)
  └─ always → roundActive

roundActive (invoke timer)
  └─ playerTurn
        checkingCards
          ├─ no cards → roundEnd
          ├─ multiple matches → selecting
          ├─ single match → evaluating (auto-play)
          └─ no matches → drawing
        (Note: checkingCards has a topline delay that applies to all branches.
         In the current architecture, this enables the auto-play amber highlight
         animation but also delays manual selection and drawing paths. A potential
         optimization would move the delay into the auto-play branch only.)
        selecting
          └─ 'card.play' (guard: canPlaySelectedCards) → evaluating
        drawing (entry: drawCard)
          └─ evaluating
        evaluating
          ├─ player empty → roundEnd
          └─ changeTurn
        changeTurn (entry: advanceTurn)
          └─ checkingCards

roundEnd (entry: calculateScores)
```

## Timing Architecture

The state machine controls all timing via `GAME_TIMING` constants in `/lib/constants.ts`. These delays define finite time windows for each state, and UI animations are subordinate to these windows.

**Design Principle:**
- State machine delays define **state duration** (how long a state lasts)
- Animations read these constants and **fill the available window**
- As long as `animation duration ≤ state duration`, the system works correctly

**Example:**
```typescript
CHECKING_DELAY: 2000  // State lasts 2000ms
autoPlaying animation: duration = CHECKING_DELAY / 1000  // Uses full 2s
```

This is **time-based coordination** (not event-driven). The state machine is the clock - it doesn't wait for animations to signal completion. This approach is appropriate for games with predictable, fixed-duration animations where consistent timing is more important than perfect animation synchronization.

**Alternative Approaches:**
- Event-driven (animations send `ANIMATION_COMPLETE` events) would be more complex but allow variable-duration animations
- Invoked actors (XState owns animation lifecycle) would couple state machine to UI layer
- Current approach: Simple, maintainable, deterministic - good fit for fixed-duration game animations

## Tech Stack

- **State Management**: XState v5 (Actor Model)
- **Framework**: Next.js 16+ with App Router
- **Runtime**: Bun
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build
```

## Documentation

- `docs/CLAUDE.md` - Complete architecture guide and implementation status
- `docs/XSTATE_DOCS.md` - XState v5 reference
- `machines/cardGameMachine.ts` - Main game state machine implementation
