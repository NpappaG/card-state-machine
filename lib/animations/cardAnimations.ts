import { GAME_TIMING } from '@/lib/constants';

/**
 * Build autoPlaying animation with timing calculated from AUTO_PLAY_DELAY
 * Phases: Lift (20%) → Settle (15%) → Hold (65%)
 * All phases scale proportionally with the total duration
 */
function buildAutoPlayingAnimation(autoPlayDelay: number = GAME_TIMING.AUTO_PLAY_DELAY) {
  const totalDuration = autoPlayDelay; // in ms

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
      ease: [0.4, 0, 0.2, 1] as const,
    },
  };
}

/**
 * Build card animation variants with dynamic timing values
 * Used by the Card component for smooth transitions
 */
export function buildCardAnimationVariants(timing?: {
  CHECKING_DELAY?: number;
  AUTO_PLAY_DELAY?: number;
  DRAW_DELAY?: number;
  EVALUATING_DELAY?: number;
}) {
  const autoPlayDelay =
    timing?.AUTO_PLAY_DELAY ??
    timing?.CHECKING_DELAY ??
    GAME_TIMING.AUTO_PLAY_DELAY;
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
    autoPlaying: buildAutoPlayingAnimation(autoPlayDelay),
    entering: {
      scale: [0.7, 1.05, 0.98, 1],
      y: [-200, 0, -5, 0],
      x: [-250, 0, 3, 0],
      rotate: [-15, 2, -1, 0],
      rotateY: [180, 0, 0, 0],
      opacity: [0, 1, 1, 1],
      transition: {
        duration: drawDelay / 1000,
        times: [0, 0.5, 0.75, 1], // Travel 50%, wriggle 50%-75%, settle 75%-100%
        ease: [0.34, 1.56, 0.64, 1] as const, // Elastic ease with slight overshoot
      },
    },
    exiting: {
      scale: [1, 1.15, 0.85],
      x: [0, 15, 0],
      y: [0, -30, -10],
      rotate: [0, 8, 12],
      opacity: [1, 1, 0.7],
      transition: {
        duration: evaluatingDelay / 1000,
        times: [0, 0.4, 1],
        ease: [0.4, 0, 0.6, 1] as const,
      },
    },
    inHand: {
      scale: 1,
      y: 0,
      x: 0,
      rotate: 0,
      opacity: 1,
    },
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, 0],
      rotate: [0, -2, 2, -2, 2, -1, 1, 0],
      transition: {
        duration: 0.5,
        ease: 'easeInOut' as const,
      },
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
export function buildAmberOverlayConfig(autoPlayDelay: number = GAME_TIMING.AUTO_PLAY_DELAY) {
  const totalDuration = autoPlayDelay; // in ms

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
