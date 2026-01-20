import { assign, fromCallback, sendTo, setup, type ActorRef, type Snapshot } from "xstate";

// Type for the parent actor (cardGameMachine)
// Parent can receive timer.expired events
type ParentEvent = { type: "timer.expired" };
type ParentActor = ActorRef<Snapshot<unknown>, ParentEvent>;

type TimerContext = {
  durationMs: number;
  remainingMs: number;
  startMs: number;
  pausedAt: number | null;
  tickIntervalMs: number;
  parentRef: ParentActor;
};

type TimerInput = {
  durationMs: number;
  startMs: number;
  tickIntervalMs: number;
  parentRef: ParentActor;
};

type TimerEvent =
  | { type: "timer.tick"; timestamp: number }
  | { type: "timer.pause"; timestamp: number }
  | { type: "timer.resume"; timestamp: number };

const tickLogic = fromCallback(({ sendBack, input }) => {
  const { tickIntervalMs } = input as { tickIntervalMs: number };
  const interval = setInterval(() => {
    sendBack({ type: "timer.tick", timestamp: performance.now() });
  }, tickIntervalMs);

  return () => clearInterval(interval);
});

export const timerMachine = setup({
  types: {
    context: {} as TimerContext,
    events: {} as TimerEvent,
    input: {} as TimerInput,
  },
  actors: {
    ticks: tickLogic,
  },
  actions: {
    updateRemaining: assign(({ context, event }) => {
      if (event.type !== "timer.tick") return {};
      const elapsed = event.timestamp - context.startMs;
      const remainingMs = Math.max(0, context.durationMs - elapsed);
      return { remainingMs };
    }),
    pauseTimer: assign(({ event }) => {
      if (event.type !== "timer.pause") return {};
      return { pausedAt: event.timestamp };
    }),
    resumeTimer: assign(({ context, event }) => {
      if (event.type !== "timer.resume") return {};
      if (context.pausedAt === null) return {};
      // Guard against negative durations (e.g., system clock changes)
      const pausedDuration = Math.max(0, event.timestamp - context.pausedAt);
      const newStartMs = context.startMs + pausedDuration;
      // Recalculate remainingMs immediately so UI shows correct time
      const elapsed = event.timestamp - newStartMs;
      const remainingMs = Math.max(0, context.durationMs - elapsed);
      return {
        startMs: newStartMs,
        remainingMs,
        pausedAt: null,
      };
    }),
    notifyExpired: sendTo(
      ({ context }) => context.parentRef,
      { type: "timer.expired" }
    ),
  },
  guards: {
    timerExpired: ({ context }) => context.remainingMs <= 0,
  },
}).createMachine({
  id: "roundTimer",
  context: ({ input }) => ({
    durationMs: input.durationMs,
    remainingMs: input.durationMs,
    startMs: input.startMs,
    pausedAt: null,
    tickIntervalMs: input.tickIntervalMs,
    parentRef: input.parentRef,
  }),
  initial: "running",
  states: {
    running: {
      invoke: {
        src: "ticks",
        input: ({ context }) => ({ tickIntervalMs: context.tickIntervalMs }),
      },
      on: {
        "timer.tick": {
          actions: "updateRemaining",
        },
        "timer.pause": {
          target: "paused",
          actions: "pauseTimer",
        },
      },
      always: {
        guard: "timerExpired",
        target: "expired",
        actions: "notifyExpired",
      },
    },
    paused: {
      on: {
        "timer.resume": {
          target: "running",
          actions: "resumeTimer",
        },
      },
    },
    expired: {
      type: "final",
    },
  },
});
