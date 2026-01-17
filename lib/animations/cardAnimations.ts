import { GAME_TIMING } from '@/lib/constants';

/**
 * Build autoPlaying animation with timing calculated from CHECKING_DELAY
 * Phases: Lift (400ms) → Settle (300ms) → Hold (remainder)
 */
function buildAutoPlayingAnimation() {
  const totalDuration = GAME_TIMING.CHECKING_DELAY; // in ms
  const liftDuration = 400;
  const settleDuration = 300;

  // Calculate proportional keyframe positions
  const liftEnd = liftDuration / totalDuration;
  const settleEnd = (liftDuration + settleDuration) / totalDuration;

  return {
    scale: [1, 1.1, 1.08, 1.08],
    y: [0, -15, -12, -12],
    x: 0,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: totalDuration / 1000, // Convert to seconds
      times: [0, liftEnd, settleEnd, 1], // Calculated from phase durations
      ease: [0.4, 0, 0.2, 1],
    },
  };
}

/**
 * Card animation variants for different states
 * Used by the Card component for smooth transitions
 */
export const cardAnimationVariants = {
  idle: {
    scale: 1,
    y: 0,
    x: 0,
    rotate: 0,
    opacity: 1,
  },
  selected: {
    scale: 1.05,
    y: -10,
    x: 0,
    rotate: 0,
    opacity: 1,
  },
  autoPlaying: buildAutoPlayingAnimation(),
  entering: {
    scale: 1,
    y: 0,
    x: 0,
    rotate: 0,
    rotateY: 0,
    opacity: 1,
    transition: {
      duration: GAME_TIMING.DRAW_DELAY / 1000,
      ease: [0.4, 0, 0.2, 1], // Custom easeIn curve
    },
  },
  exiting: {
    scale: 0.9,
    x: 0,
    y: 0,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: GAME_TIMING.EVALUATING_DELAY / 1000,
      type: 'spring',
      stiffness: 80,
      damping: 15,
    },
  },
  inHand: {
    scale: 1,
    y: 0,
    x: 0,
    rotate: 0,
    opacity: 1,
  },
} as const;

/**
 * Initial position for cards being drawn from the deck
 */
export const cardDrawInitialState = {
  y: -200,
  x: -250,
  scale: 0.7,
  rotate: -15,
  rotateY: 180,
  opacity: 1,
};

/**
 * Timing for the blue card back overlay during flip
 * Flip happens at the midpoint of DRAW_DELAY animation
 */
export const CARD_FLIP_TIMING = {
  get blueBackDelay() {
    return (GAME_TIMING.DRAW_DELAY / 2) / 1000; // Midpoint in seconds
  },
  blueBackDuration: 0.001, // Instant hide (seconds)
  get faceFadeDelay() {
    return (GAME_TIMING.DRAW_DELAY / 2) / 1000; // Midpoint in seconds
  },
  faceFadeDuration: 0.1, // Quick fade in (seconds)
};

/**
 * Build amber overlay animation config that matches autoPlaying timing
 * Same phase durations: Lift (400ms) → Settle (300ms) → Hold (remainder)
 */
export function buildAmberOverlayConfig() {
  const totalDuration = GAME_TIMING.CHECKING_DELAY; // in ms
  const liftDuration = 400;
  const settleDuration = 300;

  const liftEnd = liftDuration / totalDuration;
  const settleEnd = (liftDuration + settleDuration) / totalDuration;

  return {
    opacity: [0, 0.45, 0.4, 0.4],
    transition: {
      duration: totalDuration / 1000,
      times: [0, liftEnd, settleEnd, 1],
      ease: 'easeOut' as const,
    },
  };
}
