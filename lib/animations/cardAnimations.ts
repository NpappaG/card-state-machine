import { GAME_TIMING } from '@/lib/constants';

/**
 * Build autoPlaying animation with timing calculated from CHECKING_DELAY
 * Phases: Lift (20%) → Settle (15%) → Hold (65%)
 * All phases scale proportionally with the total duration
 */
function buildAutoPlayingAnimation(checkingDelay: number = GAME_TIMING.CHECKING_DELAY) {
  const totalDuration = checkingDelay; // in ms

  // Proportional phase percentages (instead of fixed milliseconds)
  const liftPercent = 0.20;    // 20% for lift
  const settlePercent = 0.15;  // 15% for settle
  // holdPercent = 0.65 (65% for hold - implicit)

  // Calculate keyframe positions
  const liftEnd = liftPercent;
  const settleEnd = liftPercent + settlePercent;

  return {
    scale: [1, 1.1, 1.08, 1.08],
    y: [0, -15, -12, -12],
    x: 0,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: totalDuration / 1000, // Convert to seconds
      times: [0, liftEnd, settleEnd, 1], // Proportional keyframes
      ease: [0.4, 0, 0.2, 1],
    },
  };
}

/**
 * Build card animation variants with dynamic timing values
 * Used by the Card component for smooth transitions
 */
export function buildCardAnimationVariants(timing?: {
  CHECKING_DELAY?: number;
  DRAW_DELAY?: number;
  EVALUATING_DELAY?: number;
}) {
  const checkingDelay = timing?.CHECKING_DELAY ?? GAME_TIMING.CHECKING_DELAY;
  const drawDelay = timing?.DRAW_DELAY ?? GAME_TIMING.DRAW_DELAY;
  const evaluatingDelay = timing?.EVALUATING_DELAY ?? GAME_TIMING.EVALUATING_DELAY;

  return {
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
    autoPlaying: buildAutoPlayingAnimation(checkingDelay),
    entering: {
      scale: 1,
      y: 0,
      x: 0,
      rotate: 0,
      rotateY: 0,
      opacity: 1,
      transition: {
        duration: drawDelay / 1000,
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
        duration: evaluatingDelay / 1000,
        type: 'spring' as const,
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
  };
}

/**
 * Default card animation variants using static GAME_TIMING
 * @deprecated Use buildCardAnimationVariants() for dynamic timing
 */
export const cardAnimationVariants = buildCardAnimationVariants();

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
 * Build timing for the blue card back overlay during flip
 * Flip happens at the midpoint of DRAW_DELAY animation
 */
export function buildCardFlipTiming(drawDelay: number = GAME_TIMING.DRAW_DELAY) {
  return {
    blueBackDelay: (drawDelay / 2) / 1000, // Midpoint in seconds
    blueBackDuration: 0.001, // Instant hide (seconds)
    faceFadeDelay: (drawDelay / 2) / 1000, // Midpoint in seconds
    faceFadeDuration: 0.1, // Quick fade in (seconds)
  };
}

/**
 * Default card flip timing using static GAME_TIMING
 * @deprecated Use buildCardFlipTiming() for dynamic timing
 */
export const CARD_FLIP_TIMING = buildCardFlipTiming();

/**
 * Build amber overlay animation config that matches autoPlaying timing
 * Same phase percentages: Lift (20%) → Settle (15%) → Hold (65%)
 */
export function buildAmberOverlayConfig(checkingDelay: number = GAME_TIMING.CHECKING_DELAY) {
  const totalDuration = checkingDelay; // in ms

  // Proportional phase percentages (matching autoPlaying animation)
  const liftPercent = 0.20;
  const settlePercent = 0.15;

  const liftEnd = liftPercent;
  const settleEnd = liftPercent + settlePercent;

  return {
    opacity: [0, 0.45, 0.4, 0.4],
    transition: {
      duration: totalDuration / 1000,
      times: [0, liftEnd, settleEnd, 1],
      ease: 'easeOut' as const,
    },
  };
}
