// Card types
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type Card = {
  suit: Suit;
  rank: Rank;
  value: number; // 1-13 based on scoring system
  id: string; // unique identifier (e.g., "hearts-A")
};

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

  // Timer
  timerStartMs: number;
  timerRemainingMs: number; // 180000ms (3 minutes)

  // Scoring
  roundScores: Record<string, number>;
};

// Game events
export type GameEvent =
  | { type: 'START_GAME'; playerCount: number; playerNames?: string[] }
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'DESELECT_CARD'; cardId: string }
  | { type: 'PLAY_SELECTED' }
  | { type: 'TIMER_TICK' }
  | { type: 'TIMER_EXPIRE' }
  | { type: 'NEW_ROUND' }
  | { type: 'GAME_OVER' };
