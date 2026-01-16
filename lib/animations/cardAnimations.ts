import { GAME_TIMING } from '@/lib/constants';

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
  autoPlaying: {
    scale: [1, 1.1, 1.08, 1.08],
    y: [0, -15, -12, -12],
    x: 0,
    rotate: 0,
    opacity: 1,
    transition: {
      duration: GAME_TIMING.CHECKING_DELAY / 1000,
      times: [0, 0.2, 0.35, 1], // Lift 20%, settle 35%, hold rest
      ease: [0.4, 0, 0.2, 1],
    },
  },
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
 * Calculated from DRAW_DELAY to ensure flip happens at midpoint
 */
export const CARD_FLIP_TIMING = {
  blueBackDelay: (GAME_TIMING.DRAW_DELAY / 1000) / 2, // Hide blue back at midpoint
  blueBackDuration: 0.001, // How fast to hide (seconds)
  faceFadeDelay: (GAME_TIMING.DRAW_DELAY / 1000) / 2, // Show face at midpoint
  faceFadeDuration: 0.1, // How fast to fade in (seconds)
};
