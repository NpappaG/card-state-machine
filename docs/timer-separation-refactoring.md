# Timer Separation Refactoring

## Summary

Successfully separated timer logic into its own machine with full ownership of timer state. The parent game machine no longer duplicates or mirrors timer state.

## What Changed

### 1. Timer Machine (`timerMachine.ts`)
- **Owns ALL timer state**: `remainingMs`, `startMs`, `pausedAt`
- **Self-contained**: Handles pause/resume logic internally
- **Minimal coupling**: Only notifies parent on `timer.expired` event
- **Removed**: `notifyTick` action (no more tick-by-tick updates to parent)

### 2. Game Context (`lib/types.ts`)
**Removed** timer state fields:
- ~~`timerStartMs`~~
- ~~`timerRemainingMs`~~
- ~~`pausedAt`~~

### 3. Game Logic (`lib/cardGameLogic.ts`)
**Removed** timer-related reducers:
- ~~`startTimerReducer()`~~
- ~~`updateTimerReducer()`~~
- ~~`pauseTimerReducer()`~~
- ~~`resumeTimerReducer()`~~
- Deprecated `timerExpired()` guard (now reads from actor)

### 4. Game Machine (`cardGameMachine.ts`)

**Removed actions:**
- ~~`startTimer`~~
- ~~`updateTimer`~~
- ~~`pauseTimer` / `pauseTimerActor`~~
- ~~`resumeTimer` / `resumeTimerActor`~~
- ~~`expireTimer`~~

**Added simpler actions:**
- `forwardPauseToTimer` - sends pause event to timer actor
- `forwardResumeToTimer` - sends resume event to timer actor

**Removed context fields:**
```typescript
// Before
context: {
  timerStartMs: 0,
  timerRemainingMs: GAME_TIMING.ROUND_DURATION_MS,
  pausedAt: null,
  // ...
}

// After
context: {
  // Timer state removed - lives in timer actor
  // ...
}
```

**Removed guards:**
- ~~`timerExpired`~~ (would read from actor snapshot instead)

**Removed event handlers:**
- ~~`"timer.tick"`~~ (parent no longer needs tick updates)

**Simplified invoke:**
```typescript
// Before - used context.timerStartMs
invoke: {
  input: ({ context }) => ({
    startMs: context.timerStartMs, // ❌ depends on parent context
  })
}

// After - uses event timestamp directly
invoke: {
  input: ({ event }) => {
    const startEvent = event as Extract<GameEvent, { type: "game.start" }>;
    return {
      startMs: startEvent.timestamp, // ✅ independent
    };
  }
}
```

## Benefits

### ✅ Single Source of Truth
Timer state lives in exactly one place: the timer machine.

### ✅ No Synchronization Overhead
No need to mirror timer state in parent context or keep it in sync.

### ✅ Cleaner Separation of Concerns
- Timer machine: Handles countdown, pause/resume
- Game machine: Reacts to timer expiration

### ✅ More Reusable
Timer machine can be used by other machines without modification.

### ✅ Testable in Isolation
Timer machine can be tested independently without the game logic.

### ✅ Reduced Complexity
- Fewer actions (5 timer actions → 2 forwarding actions)
- Simpler context (3 fewer fields)
- No tick-by-tick updates

## How to Read Timer State

Use the helper functions in `lib/timerHelpers.ts`:

### In UI Components
```typescript
import { useSelector } from "@xstate/react";
import { getTimerRemainingMs, formatTime } from "@/lib/timerHelpers";

function GameTimer() {
  const remainingMs = useSelector(gameActor, (snapshot) => {
    const timerActor = snapshot.children.timer;
    return getTimerRemainingMs(timerActor);
  });

  return <div>Time: {formatTime(remainingMs)}</div>;
}
```

### In Guards (if needed)
```typescript
guards: {
  someGuard: ({ self }) => {
    const timerActor = self.system.get('timer');
    return isTimerExpired(timerActor);
  }
}
```

## Migration Notes

If you have existing code that reads timer state from game context:

```typescript
// ❌ Before (no longer works)
const { timerRemainingMs } = gameSnapshot.context;

// ✅ After
const timerActor = gameSnapshot.children.timer;
const timerRemainingMs = getTimerRemainingMs(timerActor);
```

## Architecture Decision

We chose **full separation** over keeping state in both places because:

1. Duplicated state creates synchronization burden
2. Parent doesn't need tick-by-tick updates (only needs to know when expired)
3. Timer becomes a true black box that can be swapped/tested independently
4. Follows the principle: "Data should live in exactly one place"

## Next Steps

If you need more timer features (like "add time", "change speed", etc.), they can be added to the timer machine without touching the game machine at all.
