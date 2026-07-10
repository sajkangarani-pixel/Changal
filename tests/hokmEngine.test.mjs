import assert from "node:assert/strict";
import {
  applyCardPlay,
  createDeck,
  createInitialGameState,
  dealFirstFive,
  dealRemainingCards,
  getLegalCards,
  getTeamForSeat,
  isMatchFinished,
  isRoundFinished,
  resolveTrickWinner,
  shuffleDeck
} from "../src/services/hokmEngine.js";

const deck = createDeck();
assert.equal(deck.length, 52, "deck has 52 cards");
assert.equal(new Set(deck.map((card) => card.id)).size, 52, "deck has 52 unique cards");

const shuffled = shuffleDeck(deck, "test-seed");
assert.equal(shuffled.length, 52, "shuffle keeps card count");
assert.equal(new Set(shuffled.map((card) => card.id)).size, 52, "shuffle keeps unique cards");

const firstDeal = dealFirstFive(shuffled, 2);
assert.equal(firstDeal.hands[2].length, 5, "hakim receives first five cards");
const fullDeal = dealRemainingCards(firstDeal.deck, firstDeal.hands);
assert.deepEqual(
  Object.values(fullDeal.hands).map((hand) => hand.length),
  [13, 13, 13, 13],
  "remaining deal gives every player 13 cards"
);

const hand = [
  { id: "2S", suit: "spades", value: 2 },
  { id: "AH", suit: "hearts", value: 14 }
];
const trick = [{ seat: 1, card: { id: "5S", suit: "spades", value: 5 } }];
assert.deepEqual(getLegalCards(hand, trick).map((card) => card.id), ["2S"], "follow suit is enforced");

assert.equal(
  resolveTrickWinner(
    [
      { seat: 1, card: { id: "AS", suit: "spades", value: 14 } },
      { seat: 2, card: { id: "2H", suit: "hearts", value: 2 } },
      { seat: 3, card: { id: "KS", suit: "spades", value: 13 } },
      { seat: 4, card: { id: "QS", suit: "spades", value: 12 } }
    ],
    "hearts"
  ).seat,
  2,
  "trump beats led suit"
);

assert.equal(
  resolveTrickWinner(
    [
      { seat: 1, card: { id: "9C", suit: "clubs", value: 9 } },
      { seat: 2, card: { id: "AC", suit: "clubs", value: 14 } },
      { seat: 3, card: { id: "KD", suit: "diamonds", value: 13 } },
      { seat: 4, card: { id: "QC", suit: "clubs", value: 12 } }
    ],
    "hearts"
  ).seat,
  2,
  "highest led suit wins without trump"
);

assert.equal(getTeamForSeat(1), "team1", "seat 1 belongs to team 1");
assert.equal(getTeamForSeat(3), "team1", "seat 3 belongs to team 1");
assert.equal(getTeamForSeat(2), "team2", "seat 2 belongs to team 2");
assert.equal(getTeamForSeat(4), "team2", "seat 4 belongs to team 2");
assert.equal(isRoundFinished(7, 2), true, "first team to 7 tricks wins round");
assert.equal(isMatchFinished(3, 1, 3), true, "match ends at rounds target");

const state = {
  ...createInitialGameState(3),
  phase: "playing",
  trumpSuit: "hearts",
  turnSeat: 1,
  hands: {
    1: [{ id: "2S", suit: "spades", value: 2 }],
    2: [],
    3: [],
    4: []
  },
  currentTrick: []
};
const nextState = applyCardPlay(state, 1, "2S");
assert.equal(nextState.hands[1].length, 0, "played card leaves hand");
assert.equal(nextState.turnSeat, 2, "turn advances clockwise");

console.log("hokmEngine tests passed");
