## Overview

This document outlines the requirements for a turn-based card game system using XState v5.

## Game Mechanics

*   **Objective**: Be the first to discard all your cards, or have the lowest total hand value when the 3-minute round timer expires.
*   **Card Play**: Players alternate placing cards on a shared discard pile. You can only play cards that have the same rank as the top card of the discard pile. If you cannot play a match, you must take another card from the deck.

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
