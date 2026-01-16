"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const cardGameMachine_1 = require("../machines/cardGameMachine");
function makeCard(rank, suit = 'hearts') {
    const values = {
        A: 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '10': 10,
        J: 11,
        Q: 12,
        K: 13,
    };
    return {
        id: `${suit}-${rank}`,
        rank,
        suit,
        value: values[rank],
    };
}
function makePlayer(hand, id = 'player-1') {
    return { id, name: id, hand, score: 0 };
}
function buildState(value, context) {
    const fullContext = {
        players: context.players ?? [makePlayer([])],
        currentPlayerIndex: context.currentPlayerIndex ?? 0,
        deck: context.deck ?? [],
        discardPile: context.discardPile ?? [],
        selectedCards: context.selectedCards ?? [],
        timerStartMs: context.timerStartMs ?? 0,
        timerRemainingMs: context.timerRemainingMs ?? 180000,
        roundScores: context.roundScores ?? {},
    };
    return cardGameMachine_1.cardGameMachine.resolveState({
        value,
        context: fullContext,
    });
}
(0, node_test_1.default)('game.start deals five cards per player and seeds discard pile', () => {
    const machine = cardGameMachine_1.cardGameMachine;
    const initial = machine.getInitialState();
    const next = machine.transition(initial, {
        type: 'game.start',
        playerCount: 2,
    });
    const { players, discardPile } = next.context;
    strict_1.default.equal(players.length, 2);
    players.forEach((player) => strict_1.default.equal(player.hand.length, 5));
    strict_1.default.equal(discardPile.length, 1, 'should start with one discard card');
});
(0, node_test_1.default)('selecting state transitions to evaluating when selection matches top card', () => {
    const topCard = makeCard('K');
    const selection = [makeCard('K', 'hearts')];
    const player = makePlayer([selection[0], makeCard('Q')]);
    const selectingState = buildState({ roundActive: { playerTurn: 'selecting' } }, {
        players: [player],
        discardPile: [topCard],
        selectedCards: selection,
    });
    const next = cardGameMachine_1.cardGameMachine.transition(selectingState, { type: 'card.play' });
    strict_1.default.deepEqual(next.value, { roundActive: { playerTurn: 'evaluating' } });
    strict_1.default.equal(next.context.players[0].hand.length, 1);
});
(0, node_test_1.default)('invalid selection keeps machine in selecting state', () => {
    const topCard = makeCard('5');
    const selection = [makeCard('7'), makeCard('7', 'spades')];
    const player = makePlayer([...selection, makeCard('5', 'clubs')]);
    const selectingState = buildState({ roundActive: { playerTurn: 'selecting' } }, {
        players: [player],
        discardPile: [topCard],
        selectedCards: selection,
    });
    const next = cardGameMachine_1.cardGameMachine.transition(selectingState, { type: 'card.play' });
    strict_1.default.deepEqual(next.value, { roundActive: { playerTurn: 'selecting' } });
});
(0, node_test_1.default)('card.select adds card to selection when available', () => {
    const card = makeCard('J');
    const player = makePlayer([card]);
    const selectingState = buildState({ roundActive: { playerTurn: 'selecting' } }, {
        players: [player],
        selectedCards: [],
    });
    const next = cardGameMachine_1.cardGameMachine.transition(selectingState, { type: 'card.select', cardId: card.id });
    strict_1.default.equal(next.context.selectedCards.length, 1);
    strict_1.default.equal(next.context.selectedCards[0].id, card.id);
});
(0, node_test_1.default)('card.deselect removes card from selection', () => {
    const card = makeCard('9');
    const selectingState = buildState({ roundActive: { playerTurn: 'selecting' } }, {
        players: [makePlayer([card])],
        selectedCards: [card],
    });
    const next = cardGameMachine_1.cardGameMachine.transition(selectingState, { type: 'card.deselect', cardId: card.id });
    strict_1.default.equal(next.context.selectedCards.length, 0);
});
