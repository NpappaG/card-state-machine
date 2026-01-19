import { assign, fromCallback, sendParent, setup } from "xstate";

type TimerContext = {
  durationMs: number;
  remainingMs: number;
  startMs: number;
  pausedAt: number | null;
  tickIntervalMs: number;
};

type TimerInput = {
  durationMs: number;
  startMs: number;
  tickIntervalMs: number;
};

type TimerEvent =
  | { type: "timer.tick"; timestamp: number }
  | { type: "timer.pause"; timestamp: number }
  | { type: "timer.resume"; timestamp: number }
  | { type: "timer.stop" };

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
      const pausedDuration = event.timestamp - context.pausedAt;
      return {
        startMs: context.startMs + pausedDuration,
        pausedAt: null,
      };
    }),
    notifyExpired: sendParent({ type: "timer.expired" }),
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
        "timer.stop": {
          target: "stopped",
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
        "timer.stop": {
          target: "stopped",
        },
      },
    },
    expired: {
      on: {
        "timer.stop": {
          target: "stopped",
        },
      },
    },
    stopped: {
      type: "final",
    },
  },
});
