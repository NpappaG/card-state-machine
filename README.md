# card-state-machine

A state machine architecture for a turn-based card game system using XState v5.

## Overview

This project implements a turn-based card matching game where 2-4 players compete to match cards by rank to a discard pile. The goal is to be the first to discard all cards or to finish with the lowest hand value when the round timer expires.

## Game Mechanics

*   **Objective**: Be the first to discard all your cards, or have the lowest total hand value when the 3-minute round timer expires.
*   **Card Play**: Match cards by rank to the top card of the shared discard pile. If you cannot play a match, you must take another card from the deck.

### Scoring System

- Ace = 1 point
- Number cards (2-10) = Face value
- Jack = 11 points
- Queen = 12 points
- King = 13 points

Standard 52-card deck in play.

### Game Setup

- **Players**: 2–4 (prompted at start)
- **Initial Deal**: Each player receives 5 cards
- **Starting Card**: One additional card is revealed to seed the discard pile
- **First Player**: Randomly selected
- **Timer**: A 3-minute round timer limits play

### Turn Loop

1. **Selecting** – If multiple cards match the top discard rank, the player can select/deselect those cards and press SPACE/“Play Selected” to place one or more matching cards on the discard pile.
2. **Auto-play** – If the active player has exactly one card that matches the rank of the top discard card, it is played automatically.
3. **Drawing** – If no matching cards exist, the player draws one card from the deck. The turn then advances to the next player; the player cannot play the newly drawn card in the same turn.

This loop repeats in player order until a hand empties, the timer expires, or the deck runs out.

### Controls

- Click a card to select/deselect it when the machine is in the `selecting` state.
- Press SPACE (or the “Play Selected” button) to play the selected cards.
- Auto-play runs without input whenever only one valid card exists.

### State Chart Outline

```
setup
  └─ 'game.start' (actions: initializeGame) → roundActive

roundActive (invoke timer)
  └─ playerTurn
        checkingCards (200ms - fast decision routing)
          ├─ no cards → roundEnd
          ├─ multiple matches → selecting
          ├─ single match → autoPlaying
          └─ no matches → drawing
        autoPlaying (1000ms - dedicated animation window)
          └─ after AUTO_PLAY_DELAY / autoPlaySingleCard → evaluating
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

**Current timing window values (from `/lib/constants.ts`):**

| Segment          | Constant                        | Duration (ms) | Purpose                                                  |
| ---------------- | ------------------------------- | ------------- | -------------------------------------------------------- |
| Decision routing | `GAME_TIMING.CHECKING_DELAY`    | 200           | Fast routing to appropriate state                        |
| Auto-play anim   | `GAME_TIMING.AUTO_PLAY_DELAY`   | 1000          | Dedicated animation window for auto-playing single card  |
| Draw animation   | `GAME_TIMING.DRAW_DELAY`        | 1155          | Covers deck-to-hand travel + flip                       |
| Evaluate result  | `GAME_TIMING.EVALUATING_DELAY`  | 400           | Lets discard animations finish + checks win condition    |
| Turn highlight   | `GAME_TIMING.TURN_CHANGE_DELAY` | 400           | Gives UI time to highlight the next player               |
| Round timer      | `GAME_TIMING.ROUND_DURATION_MS` | 180000        | 3-minute round duration                                  |

**Proportional Animation System:**

Animations calculate their keyframe timing proportionally based on fixed phase durations:

```typescript
// Animation builder calculates timing from state duration
function buildAutoPlayingAnimation() {
  const totalDuration = GAME_TIMING.AUTO_PLAY_DELAY; // 1000ms
  const liftDuration = 400;   // Fixed: lift phase
  const settleDuration = 300; // Fixed: settle phase
  // Hold phase = remainder (300ms)

  // Calculate proportional keyframe positions
  const liftEnd = liftDuration / totalDuration;     // 0.4 (40%)
  const settleEnd = (liftDuration + settleDuration) / totalDuration; // 0.7 (70%)

  return {
    scale: [1, 1.1, 1.08, 1.08],
    transition: {
      duration: totalDuration / 1000, // 1s
      times: [0, liftEnd, settleEnd, 1], // Calculated, not hardcoded
    },
  };
}
```

If `CHECKING_DELAY` changes to 3000ms, the animation automatically adjusts:
- Lift: 400ms (13.3%)
- Settle: 300ms (10%)
- Hold: 2300ms (76.7%)

This is **time-based coordination** (not event-driven). The state machine is the clock - it doesn't wait for animations to signal completion. This approach is appropriate for games with predictable, fixed-duration animations where consistent timing is more important than perfect animation synchronization.

**Alternative Approaches:**

- Event-driven (animations send `ANIMATION_COMPLETE` events) would be more complex but allow variable-duration animations
- Invoked actors (XState owns animation lifecycle) would couple state machine to UI layer
- Current approach: Simple, maintainable, deterministic - good fit for fixed-duration game animations

**Optimized State Routing:**

The state machine uses a dedicated `autoPlaying` state to isolate the animation delay:

- **checkingCards** (200ms): Fast decision logic routes to appropriate state
- **autoPlaying** (1000ms): Dedicated animation window for auto-play path only
- **selecting/drawing**: Immediate responsiveness - no artificial delays

This architecture eliminates the "topline bottleneck" where all paths shared the same delay. Now:
- ✅ **Auto-play path**: Has dedicated 1s animation window
- ✅ **Manual selection**: Immediately responsive (200ms routing only)
- ✅ **Drawing path**: Immediately responsive (200ms routing only)

**Implementation:**
Uses guarded transitions in `checkingCards` for declarative routing:

```
checkingCards (200ms)
  ├─ hasMultipleValidCards → selecting (responsive!)
  ├─ hasSingleValidCard → autoPlaying (1000ms animation)
  ├─ deckEmpty → roundEnd
  └─ default → drawing (responsive!)
```

This separates decision logic from animation timing, following the principle that each state should represent a distinct phase.

## State Machine Schema

### Config
- Parallel: `false`

### Context
- `players`: Array of `{ id, name, hand, score }`
- `currentPlayerIndex`: Index of active player
- `deck`: Remaining draw pile
- `discardPile`: Cards that have been played
- `selectedCards`: Currently highlighted cards (one or more)
- `roundScores`: Final scores recorded at round end
- `timing`: Configurable delays for animations

**Note:** Timer state (`remainingMs`, `startMs`) lives in the timer machine actor, not in game context.

### States
- `setup`: Await `game.start`
- `roundActive`
  - `playing`
    - `playerTurn`
      - `checkingCards`: fast decision routing (200ms)
      - `autoPlaying`: dedicated auto-play animation state (1000ms)
      - `selecting`: player chooses matching cards (multi-card selection supported)
      - `drawing`: forced draw animation
      - `evaluating`: check win condition or continue
      - `changingTurn`: advance to next player
    - `hist`: history state for pause/resume
  - `paused`: game paused, timer frozen
- `roundEnd`: Scores calculated, can restart round or end game

### Events

**External Events:**
- `game.start` - User starts a new game
- `round.start` - User starts a new round (keeps players, resets deck)
- `game.over` - User ends game, returns to setup
- `card.select`, `card.deselect` - User selects/deselects cards
- `card.play` - User plays selected cards (SPACE key)
- `round.pause`, `round.resume` - User pauses/resumes game
- `timer.expired` - Timer machine notifies when time's up
- `timing.update` - Dynamic timing configuration updates

**Note:** Decision logic (auto-play vs manual selection) is now handled by guards in `checkingCards`, not internal events.

### Guards
- `canPlaySelectedCards`: All selected cards match top discard rank
- `currentPlayerHasNoCards`: Active player's hand is empty (win condition)
- `hasMultipleValidCards`: Player has 2+ cards matching top discard
- `hasSingleValidCard`: Player has exactly 1 card matching top discard
- `deckEmpty`: Used when the draw pile is empty. This may lead to a turn skip.
- `isStalemate`: A more specific check for when the deck is empty AND no player can make a valid move. This ends the round.

### Key Transitions
- `setup` --`game.start`--> `roundActive`
- `checkingCards` --after `CHECKING_DELAY` (200ms) + guards-->
  - `hasMultipleValidCards` → `selecting`
  - `hasSingleValidCard` → `autoPlaying`
  - `deckEmpty` → `roundEnd`
  - default → `drawing`
- `autoPlaying` --after `AUTO_PLAY_DELAY` (1000ms) + `autoPlaySingleCard`--> `evaluating`
- `drawing` --after `DRAW_DELAY`--> `evaluating`
- `evaluating` --`currentPlayerHasNoCards`--> `roundEnd`
- `evaluating` --else--> `changingTurn`
- `roundEnd` --`round.start`--> `roundActive` (same players)
- `roundEnd` --`game.over`--> `setup` (full reset)
- `changingTurn` --after `TURN_CHANGE_DELAY / advanceTurn`--> `checkingCards`
- `roundActive` --`timer.expired`--> `roundEnd`

### Actions
- `initializeGame`, `restartRound`, `resetGame`
- `selectCard`, `deselectCard`, `playSelectedCards`, `autoPlaySingleCard`, `drawCard`, `advanceTurn`
- `forwardPauseToTimer`, `forwardResumeToTimer`, `calculateScores`, `updateTimingConfig`

## Machines

This app uses two XState machines:
- `machines/cardGameMachine.ts` orchestrates gameplay and invokes the timer actor.
- `machines/timerMachine.ts` owns round timing and emits `timer.expired`.

Pure helpers live in `lib/cardGameLogic.ts` (game rules/reducers) and `lib/timerHelpers.ts` (timer actor accessors).

## Architectural Decisions

This project's architecture evolved to prioritize clarity, maintainability, and a positive user experience. The following are key design decisions that shape the implementation:

### 1. Time-Based Pacing over Event-Based Coordination

**Problem:** Initial versions of the machine executed state transitions instantly, causing a "cascade" where multiple turns could happen in milliseconds without the UI updating.

**Solution:** We chose a "pragmatic delays" approach, using XState's `after` delays to create observable states. The state machine acts as the "clock," and UI animations are subordinate to its timing. This provides consistent, predictable pacing without the complexity of a fully event-driven system where the UI would need to send `animation.complete` events back to the machine. This decision is detailed further in `docs/ARCHITECTURE.md`.

### 2. Guard-Based Routing over Internal Events

**Problem:** Decision-making (e.g., auto-play vs. manual selection vs. drawing) could be modeled in several ways. An early version used an intermediate `readyToAct` state that would `raise()` internal events.

**Solution:** The machine was refactored to use a more direct and declarative pattern. The `checkingCards` state now uses a prioritized list of guarded transitions. This simplifies the statechart by removing a state and internal events, making the decision logic easier to read and maintain directly within the machine definition.

### 3. Dedicated Timer Actor

**Problem:** Timer logic and game logic are separate concerns. Mixing them in the same machine's context can lead to synchronization issues and a violation of the single-source-of-truth principle.

**Solution:** The round timer is encapsulated in its own `timerMachine`. The main game machine invokes this actor and only listens for a single `timer.expired` event. All timer-related state (remaining time, pause state) is owned exclusively by the timer actor, ensuring a clean separation of concerns.

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

- `docs/XSTATE_DOCS.md` - XState v5 reference for context
- `machines/cardGameMachine.ts` - Main game state machine implementation
- `machines/timerMachine.ts` - Round timer actor machine
- `lib/cardGameLogic.ts` - Pure game rules and reducers
- `lib/timerHelpers.ts` - Timer actor accessors
- `docs/` for more agent notes

## My notes on it

Xstate is a convenient single source of truth - I definitely see the appeal for complex UI flows. It does seems intuitive that you have one ironclad skeleton for state and everything else subscribed to it.

I wanted to keep the state machine as minimal as possible and keep all UI concerns separate - that seemed like a core thing from the suggested video I watched. (Interestingly, the guy said Stately's UI formatter was bad, but I found it helpful at first to double check logic directions - it does seem to break down with some v5 syntax).

The more I learned, the more complexities arose actually. Mostly with regard to timing animations, I realized they were getting cutoff/running longer than the allotted delay windows. Then I just made the animation length a function of their possible window and realized it was a fine enough solution for a quick game. I see where devs might add more plumbing like a ui.animationComplete, and so on.
