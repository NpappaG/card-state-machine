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

- **Have the same value as top discard card (7 on 7, Queen on Queen)***If you cannnot play a match you have to take another from the deck*
### Controls

Single Card Play: Auto-play when only one valid card exists or have to pick up from the deck.
Multiple Card Selection: When multiple valid cards are available:

- Click cards to select/deselect them
- SPACE key to play all selected cards as together

### Urgency
This is a repo for a takehome coding challenge at a company I'm interviewing for and the reviewer is an Xstate expert we want to impress