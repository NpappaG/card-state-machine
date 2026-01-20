import { useMachine } from '@xstate/react'
import { useEffect, useMemo, useRef } from 'react'
import {
  createTrainingClockMachine,
  type ClockMachine,
  type ExtractEmittedEvent,
} from './trainingClockMachine'

export interface UseTimerConfig {
  /** Duration in milliseconds */
  durationMs: number
  /** Frequency tick interval in milliseconds (default: 1000ms) */
  frequencyMs?: number
  /** Number of reps/ticks to complete. -1 for infinity mode */
  reps: number
  /** Initial elapsed time in milliseconds (default: 0) */
  initialElapsedMs?: number
}

export interface UseTimerCallbacks {
  /** Called when timer starts */
  onStart?: (event: ExtractEmittedEvent<'onStart'>) => void
  /** Called on each frequency tick */
  onFrequencyTick?: (event: ExtractEmittedEvent<'onFrequencyTick'>) => void
  /** Called when timer completes */
  onFinish?: (event: ExtractEmittedEvent<'onComplete'>) => void
  /** Called when timer is paused */
  onPause?: (event: ExtractEmittedEvent<'onPause'>) => void
  /** Called when timer is resumed */
  onResume?: (event: ExtractEmittedEvent<'onResume'>) => void
  /** Called when timer is reset */
  onReset?: (event: ExtractEmittedEvent<'onReset'>) => void
  /** Called on every internal tick (100ms) - use sparingly for performance */
  onTick?: (event: ExtractEmittedEvent<'onInternalTick'>) => void
}

export interface UseTimerReturn {
  /** Current state: 'idle' | 'running' | 'paused' | 'complete' */
  status: 'idle' | 'running' | 'paused' | 'complete'
  /** Full XState state object */
  state: ReturnType<typeof useMachine<ClockMachine>>[0]
  /** Elapsed time in milliseconds */
  elapsedMs: number
  /** Total duration in milliseconds */
  durationMs: number
  /** Remaining time in milliseconds */
  remainingMs: number
  /** Progress percentage (0-100) */
  progress: number
  /** Tick progress percentage (0-100) */
  tickProgress: number
  /** Current rep number */
  currentTick: number
  /** Total number of frequency ticks to complete */
  totalTicks: number
  /** Number of reps (-1 for infinity mode) */
  reps: number
  /** Beats per second (1 / frequencyMs * 1000) */
  bps: number
  /** Start the timer */
  start: () => void
  /** Pause the timer */
  pause: () => void
  /** Resume the timer */
  resume: () => void
  /** Reset the timer */
  reset: () => void
}

/**
 * Custom hook for managing a timer with XState machine
 *
 * @example
 * ```tsx
 * const timer = useTimer(
 *   { durationMs: 60000, frequencyMs: 1000 },
 *   {
 *     onFrequencyTick: (e) => console.log('Tick:', e.tickNumber),
 *     onFinish: () => console.log('Done!'),
 *   }
 * )
 *
 * return (
 *   <div>
 *     <div>{timer.elapsedMs / 1000}s / {timer.durationMs / 1000}s</div>
 *     <button onClick={timer.start}>Start</button>
 *     <button onClick={timer.pause}>Pause</button>
 *     <button onClick={timer.reset}>Reset</button>
 *   </div>
 * )
 * ```
 */
/**
 * React-friendly timer hook
 *
 * Usage:
 * const [timer, setTimerConfig] = useTimer({ durationMs: 10000 })
 *
 * setTimerConfig({ durationMs: 20000 }) // updates config dynamically
 */
export function useTimer(
  initialConfig: UseTimerConfig,
  callbacks?: UseTimerCallbacks
): [UseTimerReturn, (next: Partial<UseTimerConfig>) => void] {
  // hold callbacks stable
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  // Create machine once with initial config
  const machine = useMemo(() => {
    const { durationMs, frequencyMs = 1000, reps, initialElapsedMs = 0 } = initialConfig
    return createTrainingClockMachine({
      durationMs,
      frequencyMs,
      reps,
      initialElapsedMs,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - create only once

  const [state, send, actor] = useMachine(machine)

  // subscribe to machine events once per actor
  useEffect(() => {
    const subs = [
      actor.on('onStart', e => callbacksRef.current?.onStart?.(e)),
      actor.on('onFrequencyTick', e => callbacksRef.current?.onFrequencyTick?.(e)),
      actor.on('onComplete', e => callbacksRef.current?.onFinish?.(e)),
      actor.on('onPause', e => callbacksRef.current?.onPause?.(e)),
      actor.on('onResume', e => callbacksRef.current?.onResume?.(e)),
      actor.on('onReset', e => callbacksRef.current?.onReset?.(e)),
      actor.on('onInternalTick', e => callbacksRef.current?.onTick?.(e)),
    ]
    return () => subs.forEach(s => s.unsubscribe())
  }, [actor])

  const { durationMs: ctxDuration, elapsedMs, frequencyMs, reps } = state.context
  const remainingMs = Math.max(0, ctxDuration - elapsedMs)
  const progress = ctxDuration > 0 ? Math.min(100, (elapsedMs / ctxDuration) * 100) : 0
  const tickProgress =
    ctxDuration > 0 ? Math.min(100, ((elapsedMs % frequencyMs) / frequencyMs) * 100) : 0
  const totalTicks = reps === -1 ? Infinity : reps
  const bps = 1000 / frequencyMs

  const controls: UseTimerReturn = {
    status: state.value as 'idle' | 'running' | 'paused' | 'complete',
    state: state,
    elapsedMs,
    durationMs: ctxDuration,
    remainingMs,
    progress,
    tickProgress,
    currentTick: Math.floor(elapsedMs / frequencyMs),
    totalTicks,
    reps,
    bps,
    start: () => send({ type: 'START' }),
    pause: () => send({ type: 'PAUSE' }),
    resume: () => send({ type: 'RESUME' }),
    reset: () => send({ type: 'RESET' }),
  }

  // Config updater function
  const updateConfig = (next: Partial<UseTimerConfig>) => {
    const newReps = next.reps ?? state.context.reps
    const newFrequencyMs = next.frequencyMs ?? state.context.frequencyMs

    send({
      type: 'UPDATE_CONFIG',
      reps: newReps,
      frequencyMs: newFrequencyMs,
    })
  }

  return [controls, updateConfig]
}