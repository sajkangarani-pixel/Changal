export const HOKM_SUITS = ["spades", "hearts", "diamonds", "clubs"];
export const HOKM_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const SUIT_META = {
  spades: { label: "پیک", symbol: "♠", color: "black" },
  hearts: { label: "دل", symbol: "♥", color: "red" },
  diamonds: { label: "خشت", symbol: "♦", color: "red" },
  clubs: { label: "گشنیز", symbol: "♣", color: "black" }
};

const RANK_VALUES = {
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

export function createDeck() {
  return HOKM_SUITS.flatMap((suit) =>
    HOKM_RANKS.map((rank) => {
      const meta = SUIT_META[suit];
      const value = getCardRankValue(rank);
      return {
        id: `${rank}${suit[0].toUpperCase()}`,
        rank,
        suit,
        label: `${rank}${meta.symbol}`,
        faSuit: meta.label,
        symbol: meta.symbol,
        color: meta.color,
        value
      };
    })
  );
}

export function shuffleDeck(deck, seed = "") {
  const next = [...deck];
  const random = seed ? seededRandom(seed) : Math.random;

  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }

  return next;
}

export function sortHand(hand = [], trumpSuit = "") {
  const suitOrder = trumpSuit
    ? [...HOKM_SUITS.filter((suit) => suit !== trumpSuit), trumpSuit]
    : HOKM_SUITS;

  return [...hand].sort((a, b) => {
    const suitDelta = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    return suitDelta || b.value - a.value;
  });
}

export function getCardRankValue(rank) {
  return RANK_VALUES[rank] || Number(rank);
}

export function getSuitLabel(suit) {
  return SUIT_META[suit]?.label || suit;
}

export function getSuitSymbol(suit) {
  return SUIT_META[suit]?.symbol || "";
}

export function getTeamForSeat(seat) {
  return Number(seat) === 1 || Number(seat) === 3 ? "team1" : "team2";
}

export function getNextSeat(seat) {
  return Number(seat) === 4 ? 1 : Number(seat) + 1;
}

export function getPartnerSeat(seat) {
  const normalized = Number(seat);
  return normalized <= 2 ? normalized + 2 : normalized - 2;
}

export function getSeatOrderFrom(startSeat) {
  const order = [Number(startSeat)];
  while (order.length < 4) order.push(getNextSeat(order[order.length - 1]));
  return order;
}

export function dealFirstFive(deck, hakimSeat) {
  const nextDeck = [...deck];
  const hands = createEmptyHands();
  hands[String(hakimSeat)] = nextDeck.splice(0, 5);
  return { deck: nextDeck, hands };
}

export function dealRemainingCards(deck, hands, trumpSuit = "") {
  const nextDeck = [...deck];
  const nextHands = cloneHands(hands);

  while (nextDeck.length && Object.values(nextHands).some((hand) => hand.length < 13)) {
    for (const seat of ["1", "2", "3", "4"]) {
      if (!nextDeck.length) break;
      if (nextHands[seat].length < 13) {
        nextHands[seat].push(nextDeck.shift());
      }
    }
  }

  return {
    deck: nextDeck,
    hands: Object.fromEntries(
      Object.entries(nextHands).map(([seat, hand]) => [seat, sortHand(hand, trumpSuit)])
    )
  };
}

export function getLedSuit(currentTrick = []) {
  return currentTrick[0]?.card?.suit || "";
}

export function getLegalCards(hand = [], currentTrick = [], ledSuit = getLedSuit(currentTrick)) {
  if (!currentTrick.length || !ledSuit) return hand;
  const matchingSuit = hand.filter((card) => card.suit === ledSuit);
  return matchingSuit.length ? matchingSuit : hand;
}

export function canPlayCard(hand, card, currentTrick) {
  return getLegalCards(hand, currentTrick).some((legalCard) => legalCard.id === card.id);
}

export function resolveTrickWinner(currentTrick = [], trumpSuit = "") {
  if (currentTrick.length !== 4) return null;
  const ledSuit = getLedSuit(currentTrick);
  const trumpCards = currentTrick.filter((play) => play.card.suit === trumpSuit);
  const candidates = trumpCards.length
    ? trumpCards
    : currentTrick.filter((play) => play.card.suit === ledSuit);

  return candidates.reduce((winner, play) => (play.card.value > winner.card.value ? play : winner), candidates[0]);
}

export function applyCardPlay(state, seat, cardId) {
  const playerSeat = String(seat);
  if (state.phase !== "playing") throw new Error("game_not_playing");
  if (String(state.turnSeat) !== playerSeat) throw new Error("not_your_turn");

  const hands = cloneHands(state.hands);
  const hand = hands[playerSeat] || [];
  const card = hand.find((item) => item.id === cardId);
  if (!card) throw new Error("card_not_found");
  if (!canPlayCard(hand, card, state.currentTrick || [])) throw new Error("must_follow_suit");

  hands[playerSeat] = hand.filter((item) => item.id !== cardId);
  const currentTrick = [...(state.currentTrick || []), { seat: Number(playerSeat), card }];
  let next = {
    ...state,
    hands,
    currentTrick,
    lastTrick: state.lastTrick || [],
    lastTrickWinnerSeat: state.lastTrickWinnerSeat || null,
    message: ""
  };

  if (currentTrick.length < 4) {
    next.turnSeat = getNextSeat(playerSeat);
    return next;
  }

  const winner = resolveTrickWinner(currentTrick, state.trumpSuit);
  const winningTeam = getTeamForSeat(winner.seat);
  const tricks = {
    team1: Number(state.tricks?.team1 || 0),
    team2: Number(state.tricks?.team2 || 0)
  };
  tricks[winningTeam] += 1;

  next = {
    ...next,
    tricks,
    currentTrick: [],
    lastTrick: currentTrick,
    lastTrickWinnerSeat: winner.seat,
    turnSeat: winner.seat,
    message: "trick_won"
  };

  if (isRoundFinished(tricks.team1, tricks.team2)) {
    const rounds = {
      team1: Number(state.rounds?.team1 || 0),
      team2: Number(state.rounds?.team2 || 0)
    };
    rounds[winningTeam] += 1;
    const hakimTeam = getTeamForSeat(state.hakimSeat);
    const nextHakimSeat = winningTeam === hakimTeam ? state.hakimSeat : getNextSeat(state.hakimSeat);
    const finished = isMatchFinished(rounds.team1, rounds.team2, state.roundsTarget);

    return {
      ...next,
      phase: finished ? "finished" : "round_ended",
      rounds,
      roundWinnerTeam: winningTeam,
      hakimSeat: nextHakimSeat,
      turnSeat: null,
      message: finished ? "match_finished" : "round_won"
    };
  }

  return next;
}

export function isRoundFinished(team1Tricks, team2Tricks) {
  return Number(team1Tricks) >= 7 || Number(team2Tricks) >= 7;
}

export function isMatchFinished(team1Rounds, team2Rounds, roundsTarget) {
  return Number(team1Rounds) >= Number(roundsTarget) || Number(team2Rounds) >= Number(roundsTarget);
}

export function createInitialGameState(roundsTarget = 3) {
  return {
    phase: "lobby",
    roundsTarget: Number(roundsTarget) || 3,
    handNumber: 0,
    hakimSeat: null,
    turnSeat: null,
    trumpSuit: "",
    deck: [],
    hands: createEmptyHands(),
    currentTrick: [],
    lastTrick: [],
    lastTrickWinnerSeat: null,
    tricks: { team1: 0, team2: 0 },
    rounds: { team1: 0, team2: 0 },
    roundWinnerTeam: "",
    message: ""
  };
}

export function startFirstHand(state) {
  const hakimSeat = state.hakimSeat || Math.floor(Math.random() * 4) + 1;
  return startHand({ ...state, hakimSeat, handNumber: 0 });
}

export function startNextRound(state) {
  return startHand({
    ...state,
    handNumber: Number(state.handNumber || 0),
    currentTrick: [],
    lastTrick: [],
    lastTrickWinnerSeat: null,
    tricks: { team1: 0, team2: 0 },
    roundWinnerTeam: "",
    message: ""
  });
}

function startHand(state) {
  const deck = shuffleDeck(createDeck());
  const hakimSeat = state.hakimSeat || 1;
  const firstDeal = dealFirstFive(deck, hakimSeat);

  return {
    ...state,
    phase: "trump_selection",
    handNumber: Number(state.handNumber || 0) + 1,
    trumpSuit: "",
    deck: firstDeal.deck,
    hands: firstDeal.hands,
    currentTrick: [],
    lastTrick: [],
    lastTrickWinnerSeat: null,
    tricks: { team1: 0, team2: 0 },
    turnSeat: hakimSeat,
    message: "select_trump"
  };
}

function createEmptyHands() {
  return { 1: [], 2: [], 3: [], 4: [] };
}

function cloneHands(hands = {}) {
  return {
    1: [...(hands[1] || hands["1"] || [])],
    2: [...(hands[2] || hands["2"] || [])],
    3: [...(hands[3] || hands["3"] || [])],
    4: [...(hands[4] || hands["4"] || [])]
  };
}

function seededRandom(seed) {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value << 5) - value + seed.charCodeAt(index);
    value |= 0;
  }

  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
