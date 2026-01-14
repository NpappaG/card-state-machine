# card-state-machine

A state machine architecture for a turn based card game system.

## Overview

You are designing the state machine architecture for a turn based card game system.

## Game Mechanics

Achieve the lowest total hand value or dispose of all your cards before the 3-minute round timer expires.

### Scoring System

- Ace = 1 point
- Number cards (2-10) = Face value
- Jack = 11 points
- Queen = 12 points
- King = 13 points

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
