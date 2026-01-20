import { Actor, fromCallback, setup } from 'xstate'

const INTERNAL_TICK_INTERVAL_MS = 100

interface ClockConfig {
  durationMs: number
  /** Default is 1000ms (1 Hz). For example, 15000 = emit a frequency tick every 15 seconds */
  frequencyMs: number
  /** Number of reps/ticks to complete. -1 for infinity mode */
  reps: number
  initialElapsedMs?: number
}

interface ClockContext {
  durationMs: number
  elapsedMs: number
  frequencyMs: number
  /** Number of reps/ticks to complete. -1 for infinity mode */
  reps: number
  lastFrequencyTickMs: number
}

type ClockEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'INTERNAL_TICK' }
  | { type: 'UPDATE_CONFIG'; reps: number; frequencyMs: number }

export type ClockEmittedEvent =
  | { type: 'onStart'; elapsedMs: number; durationMs: number }
  | { type: 'onPause'; elapsedMs: number; durationMs: number }
  | { type: 'onResume'; elapsedMs: number; durationMs: number }
  | { type: 'onReset' }
  | { type: 'onComplete'; elapsedMs: number; durationMs: number }
  | {
      type: 'onFrequencyTick'
      elapsedMs: number
      durationMs: number
      remainingMs: number
      totalTicks: number
      ticksElapsed: number
      ticksRemaining: number
      nextTickMs: number
      progressPercent: number
      frequencyMs: number
      nextFrequencyTickMs: number
      frequencyTicksElapsed: number
      frequencyTicksTotal: number
      frequencyProgressPercent: number
    }
  | {
      type: 'onInternalTick'
      elapsedMs: number
      durationMs: number
      remainingMs: number
      totalTicks: number
      ticksElapsed: number
      ticksRemaining: number
      nextTickMs: number
      progressPercent: number
      frequencyMs: number
      nextFrequencyTickMs: number
      frequencyTicksElapsed: number
      frequencyTicksTotal: number
      frequencyProgressPercent: number
    }

function shouldEmitFrequencyTick(
  elapsedMs: number,
  lastTickMs: number,
  frequencyMs: number
): boolean {
  if (frequencyMs <= 0) return false
  const currentInterval = Math.floor(elapsedMs / frequencyMs)
  const lastInterval = Math.floor(lastTickMs / frequencyMs)
  return currentInterval > lastInterval
}

export function createTrainingClockMachine(config: ClockConfig) {
  const { durationMs, frequencyMs = 1000, reps, initialElapsedMs = 0 } = config

  const clockSetup = setup({
    types: {
      context: {} as ClockContext,
      events: {} as ClockEvent,
      emitted: {} as ClockEmittedEvent,
    },
    actors: {
      internalTicker: fromCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ sendBack, input }: { sendBack: any; input: { interval: number } }) => {
          const intervalId = setInterval(() => {
            sendBack({ type: 'INTERNAL_TICK' })
          }, input.interval)

          return () => clearInterval(intervalId)
        }
      ),
    },
    guards: {
      isTimeUp: ({ context }) => {
        return context.elapsedMs >= context.durationMs
      },
      shouldEmitFrequency: ({ context }) => {
        return shouldEmitFrequencyTick(
          context.elapsedMs,
          context.lastFrequencyTickMs,
          context.frequencyMs
        )
      },
    },
  })

  const emitStart = clockSetup.emit(({ context }) => ({
    type: 'onStart' as const,
    elapsedMs: context.elapsedMs,
    durationMs: context.durationMs,
  }))

  const emitPause = clockSetup.emit(({ context }) => ({
    type: 'onPause' as const,
    elapsedMs: context.elapsedMs,
    durationMs: context.durationMs,
  }))

  const emitResume = clockSetup.emit(({ context }) => ({
    type: 'onResume' as const,
    elapsedMs: context.elapsedMs,
    durationMs: context.durationMs,
  }))

  const emitReset = clockSetup.emit({
    type: 'onReset' as const,
  })

  const emitComplete = clockSetup.emit(({ context }) => ({
    type: 'onComplete' as const,
    elapsedMs: context.elapsedMs,
    durationMs: context.durationMs,
  }))

  const computeTickMetrics = (context: ClockContext) => {
    const remainingMs = context.durationMs - context.elapsedMs
    const totalTicks = Math.ceil(context.durationMs / INTERNAL_TICK_INTERVAL_MS)
    const ticksElapsed = Math.floor(context.elapsedMs / INTERNAL_TICK_INTERVAL_MS)
    const ticksRemaining = totalTicks - ticksElapsed
    const progressPercent = (context.elapsedMs / context.durationMs) * 100

    const currentFrequencyInterval = Math.floor(context.elapsedMs / context.frequencyMs)
    const nextFrequencyTickAt = (currentFrequencyInterval + 1) * context.frequencyMs
    const nextFrequencyTickMs = nextFrequencyTickAt - context.elapsedMs
    const frequencyTicksElapsed = currentFrequencyInterval
    const frequencyTicksTotal = Math.floor(context.durationMs / context.frequencyMs)
    const msIntoCurrentInterval = context.elapsedMs % context.frequencyMs
    const frequencyProgressPercent = (msIntoCurrentInterval / context.frequencyMs) * 100

    return {
      elapsedMs: context.elapsedMs,
      durationMs: context.durationMs,
      remainingMs,
      totalTicks,
      ticksElapsed,
      ticksRemaining,
      nextTickMs: INTERNAL_TICK_INTERVAL_MS,
      progressPercent,
      frequencyMs: context.frequencyMs,
      nextFrequencyTickMs,
      frequencyTicksElapsed,
      frequencyTicksTotal,
      frequencyProgressPercent,
    }
  }

  const emitInternalTick = clockSetup.emit(({ context }) => ({
    type: 'onInternalTick' as const,
    ...computeTickMetrics(context),
  }))

  const emitFrequencyTick = clockSetup.emit(({ context }) => ({
    type: 'onFrequencyTick' as const,
    ...computeTickMetrics(context),
  }))

  const incrementElapsed = clockSetup.assign({
    elapsedMs: ({ context }) => {
      return context.elapsedMs + INTERNAL_TICK_INTERVAL_MS
    },
  })

  const updateFrequencyTick = clockSetup.assign({
    lastFrequencyTickMs: ({ context }) => context.elapsedMs,
  })

  const resetElapsed = clockSetup.assign({
    elapsedMs: initialElapsedMs,
    lastFrequencyTickMs: 0,
  })

  const updateConfig = clockSetup.assign({
    reps: ({ event }) => {
      if (event.type !== 'UPDATE_CONFIG') return 0
      return event.reps
    },
    frequencyMs: ({ event }) => {
      if (event.type !== 'UPDATE_CONFIG') return 1000
      return event.frequencyMs
    },
    durationMs: ({ event }) => {
      if (event.type !== 'UPDATE_CONFIG') return 0
      // Calculate duration from reps and frequency
      // -1 reps = infinity mode
      return event.reps === -1 ? Number.MAX_SAFE_INTEGER : event.reps * event.frequencyMs
    },
  })

  return clockSetup.createMachine({
    id: 'trainingClock',
    initial: 'idle',
    context: {
      durationMs,
      elapsedMs: initialElapsedMs,
      frequencyMs,
      reps,
      lastFrequencyTickMs: 0,
    },
    states: {
      idle: {
        on: {
          START: {
            target: 'running',
            actions: [emitStart],
          },
          UPDATE_CONFIG: {
            actions: [updateConfig],
          },
        },
      },
      running: {
        invoke: {
          src: 'internalTicker',
          input: { interval: INTERNAL_TICK_INTERVAL_MS },
        },
        on: {
          INTERNAL_TICK: [
            {
              guard: 'isTimeUp',
              target: 'complete',
            },
            {
              guard: 'shouldEmitFrequency',
              actions: [incrementElapsed, emitInternalTick, updateFrequencyTick, emitFrequencyTick],
            },
            {
              actions: [incrementElapsed, emitInternalTick],
            },
          ],
          PAUSE: {
            target: 'paused',
            actions: [emitPause],
          },
          RESET: {
            target: 'idle',
            actions: [resetElapsed, emitReset],
          },
          UPDATE_CONFIG: {
            actions: [updateConfig],
          },
        },
      },
      paused: {
        on: {
          RESUME: {
            target: 'running',
            actions: [emitResume],
          },
          RESET: {
            target: 'idle',
            actions: [resetElapsed, emitReset],
          },
          UPDATE_CONFIG: {
            actions: [updateConfig],
          },
        },
      },
      complete: {
        entry: [emitComplete],
        on: {
          START: {
            target: 'running',
            actions: [resetElapsed, emitStart],
          },
          RESET: {
            target: 'idle',
            actions: [resetElapsed, emitReset],
          },
          UPDATE_CONFIG: {
            actions: [updateConfig],
          },
        },
      },
    },
  })
}

export type ClockMachine = ReturnType<typeof createTrainingClockMachine>
export type ClockActor = Actor<ClockMachine>

// Helper type to extract specific emitted event by type
export type ExtractEmittedEvent<T extends ClockEmittedEvent['type']> = Extract<
  ClockEmittedEvent,
  { type: T }
>