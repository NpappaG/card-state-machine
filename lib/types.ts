// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type Card = {
  suit: Suit;
  rank: Rank;
  value: number; // 1-13 based on scoring system
  id: string; // unique identifier (e.g., "hearts-A")
};

export type CardAnimationState =
  | 'idle'
  | 'selected'
  | 'exiting'
  | 'inHand'
  | 'entering'
  | 'autoPlaying'
  | 'shake';

// Player type
export type Player = {
  id: string;
  name: string;
  hand: Card[];
  score: number;
};

// Game context
export type GameContext = {
  // Game setup
  players: Player[];
  currentPlayerIndex: number;

  // Card state
  deck: Card[];
  discardPile: Card[];
  selectedCards: Card[];

  // Scoring
  roundScores: Record<string, number>;

  // Timing configuration (dynamic)
  timing: {
    CHECKING_DELAY: number;
    DRAW_DELAY: number;
    EVALUATING_DELAY: number;
    TURN_CHANGE_DELAY: number;
    ROUND_DURATION_MS: number;
  };
};

// Game events (using dot notation for XState v5 convention)
export type GameEvent =
  // External events (from UI/user)
  | { type: 'game.start'; playerCount: number; playerNames?: string[]; timestamp: number }
  | { type: 'card.select'; cardId: string }
  | { type: 'card.deselect'; cardId: string }
  | { type: 'card.play' }
  | { type: 'timer.expired' }
  | { type: 'round.pause'; timestamp: number }
  | { type: 'round.resume'; timestamp: number }
  | { type: 'game.newRound'; timestamp: number }
  | { type: 'game.over' };
