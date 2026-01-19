# card-state-machine

A state machine architecture for a turn-based card game system using XState v5.

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

Standard 52-card deck in play.

### Game Setup

- **Players**: 2–4 (prompted at start)
- **Initial Deal**: Each player receives 5 cards
- **Starting Card**: One additional card is revealed to seed the discard pile
- **First Player**: Randomly selected
- **Timer**: Optional 3-minute round timer limits play

### Turn Loop

1. **Selecting** – If multiple cards match the top discard rank, the player can select/deselect those cards and press SPACE/“Play Selected” to place one or more matching cards on the discard pile.
2. **Auto-play** – If the active player has exactly one card that matches the rank of the top discard card, it is played automatically.
3. **Drawing** – If no matching cards exist, the player draws one card from the deck. Play immediately advances to the next player.

This loop repeats in player order until a hand empties, the timer expires, or the deck runs out.

### Controls

- Click a card to select/deselect it when the machine is in the `selecting` state.
- Press SPACE (or the “Play Selected” button) to play the selected cards.
- Auto-play runs without input whenever only one valid card exists.

### State Chart Outline

```
setup
  └─ 'game.start' (actions: initializeGame + startTimer) → roundActive

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

**Current timing window values (from `/lib/constants.ts`):**

| Segment          | Constant                      | Duration (ms) | Purpose                                                  |
| ---------------- | ----------------------------- | ------------- | -------------------------------------------------------- |
| Check playable   | `GAME_TIMING.CHECKING_DELAY`  | 1000          | Buffer before any auto-play/select/draw action           |
| Draw animation   | `GAME_TIMING.DRAW_DELAY`      | 1155          | Covers deck-to-hand travel + flip                       |
| Evaluate result  | `GAME_TIMING.EVALUATING_DELAY`| 400           | Lets discard animations finish + checks win condition    |
| Turn highlight   | `GAME_TIMING.TURN_CHANGE_DELAY`| 400          | Gives UI time to highlight the next player               |
| Round timer      | `GAME_TIMING.ROUND_DURATION_MS`| 180000       | 3-minute round duration                                  |

**Proportional Animation System:**

Animations calculate their keyframe timing proportionally based on fixed phase durations:

```typescript
// Animation builder calculates timing from state duration
function buildAutoPlayingAnimation() {
  const totalDuration = GAME_TIMING.CHECKING_DELAY; // 2000ms
  const liftDuration = 400;   // Fixed: lift phase
  const settleDuration = 300; // Fixed: settle phase
  // Hold phase = remainder (1300ms)

  // Calculate proportional keyframe positions
  const liftEnd = liftDuration / totalDuration;     // 0.2 (20%)
  const settleEnd = (lift + settle) / totalDuration; // 0.35 (35%)

  return {
    scale: [1, 1.1, 1.08, 1.08],
    transition: {
      duration: totalDuration / 1000, // 2s
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

**Known Trade-off: Topline Delay**

The `checkingCards` state has a 1000ms delay that applies to ALL branches (auto-play, selection, drawing). This creates a "topline bottleneck":

- **Auto-play path**: ✅ Needs the 1s buffer for the amber highlight animation
- **Manual selection path**: ⚠️ Adds a short pause before the user can click
- **Drawing path**: ⚠️ Adds a short pause before the draw animation begins

**Why keep it:**

- Simplifies state machine structure (single delay point vs. per-branch delays)
- Round timer continues during the delay, adding time pressure
- Auto-play animation still has a predictable window

**Current implementation:**
Uses guarded transitions directly in `checkingCards` for cleaner, more declarative routing:

```
checkingCards (CHECKING_DELAY)
  ├─ hasMultipleValidCards → selecting
  ├─ hasSingleValidCard → evaluating (auto-play)
  ├─ deckEmpty → roundEnd
  └─ default → drawing
```

This eliminates internal events and the intermediate `readyToAct` state.

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
      - `checkingCards`: evaluates guards after delay, routes to appropriate state
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
- `game.newRound` - User starts a new round (keeps players, resets deck)
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
- `deckEmpty`: No cards left to draw (stalemate condition)

### Key Transitions
- `setup` --`game.start`--> `roundActive`
- `checkingCards` --after `CHECKING_DELAY` + guards-->
  - `hasMultipleValidCards` → `selecting`
  - `hasSingleValidCard` → `evaluating` (auto-play)
  - `deckEmpty` → `roundEnd`
  - default → `drawing`
- `drawing` --after `DRAW_DELAY`--> `evaluating`
- `evaluating` --`currentPlayerHasNoCards`--> `roundEnd`
- `evaluating` --else--> `changingTurn`
- `roundEnd` --`game.newRound`--> `roundActive` (same players)
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
