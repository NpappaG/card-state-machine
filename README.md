# card-state-machine

A state machine architecture for a turn-based card game system using XState v5.

## Status

✅ **State Machine Complete** - Fully implemented game logic in `machines/cardGameMachine.ts`
🚧 **UI In Progress** - React components to be built next

## Overview

This project implements a complete state machine for a turn-based card matching game where 2-8 players race to empty their hands or achieve the lowest score before a 3-minute timer expires.

## Game Mechanics

Achieve the lowest total hand value or dispose of all your cards before the 3-minute round timer expires.

### Scoring System

- Ace = 1 point
- Number cards (2-10) = Face value
- Jack = 11 points
- Queen = 12 points
- King = 13 points

### Deck

Standard 52-card deck:
- **Suits**: Hearts, Diamonds, Clubs, Spades (4 suits)
- **Ranks**: Ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, Jack, Queen, King (13 ranks per suit)
- **Total Cards**: 52 cards

### Game Setup

- **Players**: 2-8 players
- **Initial Deal**: Each player receives 3 cards
- **Starting Card**: One card is dealt face-up to start the discard pile
- **First Player**: Randomly selected at the start of each game
- **Timer**: 3-minute timer starts when the starting card is revealed

### Turn-based Play

Players alternate placing cards on shared discard pile. You can only play cards that:

- **Have the same value as top discard card (7 on 7, Queen on Queen)**
- _If you cannnot play a match you have to take another from the deck_

### Controls

Single Card Play: Auto-play when only one valid card exists or have to pick up from the deck.
Multiple Card Selection: When multiple valid cards are available:

- Click cards to select/deselect them
- SPACE key to play all selected cards as together

### Requirements

Use XState to handle state - see docs/XSTATE_DOCS.md for more

StateMachine
│
├── Config
│ └── Parallel: true | false
│
├── Context
│ ├── exampleData1
│ ├── exampleData2
│ └── exampleData3
│
├── States
│ ├── STATE_ONE
│ │ ├── Description: Brief summary of this state
│ │ └── Valid Events: EVENT_A(), EVENT_B()
│ └── STATE_TWO
│ ├── Description: Brief summary of this state
│ └── Valid Events: EVENT_C()
│
├── Events
│ ├── EVENT_A()
│ │ ├── Trigger: What triggers EVENT_A
│ │ └── Data: Payload or parameters (if any)
│ ├── EVENT_B()
│ │ ├── Trigger: What triggers EVENT_B
│ │ └── Data: Payload or parameters (if any)
│ └── EVENT_C()
│ ├── Trigger: What triggers EVENT_C
│ └── Data: Payload or parameters (if any)
│
├── Guards
│ ├── guardOne()
│ │ └── Purpose: What conditional this checks; reference context params
│ └── guardTwo()
│ └── Purpose: What conditional this checks: reference context params
│
├── Transitions
│ ├── STATE_ONE → STATE_TWO
│ │ ├── Event: EVENT_A()
│ │ ├── Guard: guardOne()
│ │ ├── Exit Action (STATE_ONE): exitActionOne()
│ │ ├── Entry Action (STATE_TWO): entryActionTwo()
│ │ ├── Transition Action: transitionAction()
│ │ └── Target: STATE_TWO
│ └── STATE_TWO → STATE_ONE
│ ├── Event: EVENT_C()
│ ├── Guard: guardTwo()
│ ├── Exit Action (STATE_TWO): exitActionTwo()
│ ├── Entry Action (STATE_ONE): entryActionOne()
│ ├── Transition Action: transitionAction()
│ └── Target: STATE_ONE
│
└── Actions
├── exitActionOne()
│ ├── Type: EXIT (STATE_ONE)
│ └── Side Effect: Description of side effect or external impact
├── entryActionOne()
│ ├── Type: ENTRY (STATE_ONE)
│ └── Side Effect: Description of side effect or external impact
├── exitActionTwo()
│ ├── Type: EXIT (STATE_TWO)
│ └── Side Effect: Description of side effect or external impact
├── entryActionTwo()
│ ├── Type: ENTRY (STATE_TWO)
│ └── Side Effect: Description of side effect or external impact
└── transitionAction()
├── Type: TRANSITION
└── Side Effect: Description of side effect or external impact

## Tech Stack

- **State Management**: XState v5 (Actor Model)
- **Framework**: Next.js 16+ with App Router
- **Runtime**: Bun
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS v4

## Getting Started

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build
```

## Documentation

- `docs/CLAUDE.md` - Complete architecture guide and implementation status
- `docs/XSTATE_DOCS.md` - XState v5 reference
- `machines/cardGameMachine.ts` - Main game state machine implementation
