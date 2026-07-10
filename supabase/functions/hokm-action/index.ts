import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const SUITS = ["spades", "hearts", "diamonds", "clubs"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const ACTIVE_STATUSES = [
  "lobby",
  "dealing_first_five",
  "trump_selection",
  "dealing_remaining",
  "playing",
  "trick_resolution",
  "round_ended"
];
const TRUMP_SECONDS = 60;
const TURN_SECONDS = 45;
const ROOM_LIFETIME_HOURS = 3;

const SUIT_META: Record<string, { faSuit: string; symbol: string; color: string }> = {
  spades: { faSuit: "پیک", symbol: "♠", color: "black" },
  hearts: { faSuit: "دل", symbol: "♥", color: "red" },
  diamonds: { faSuit: "خشت", symbol: "♦", color: "red" },
  clubs: { faSuit: "گشنیز", symbol: "♣", color: "black" }
};

const ERROR_MESSAGES: Record<string, string> = {
  room_not_found: "میزی با این کد پیدا نشد.",
  room_expired: "زمان این میز تمام شده است.",
  room_full: "این میز کامل شده است.",
  invalid_code: "کد میز معتبر نیست.",
  invalid_rounds_target: "تعداد دست معتبر نیست.",
  invalid_player: "بازیکن معتبر نیست.",
  not_host: "فقط سازنده میز می‌تواند بازی را شروع کند.",
  not_your_turn: "نوبت شما نیست.",
  not_hakim: "فقط حاکم می‌تواند حکم را انتخاب کند.",
  invalid_phase: "الان زمان این کار نیست.",
  illegal_card: "باید خال زمینه را بازی کنید.",
  state_conflict: "بازی به‌روزرسانی شد. دوباره تلاش کنید.",
  network_error: "ارتباط برقرار نشد. دوباره تلاش کنید.",
  code_generation_failed: "ساخت کد میز ناموفق بود. دوباره تلاش کنید.",
  server_error: "مشکلی پیش آمد. دوباره تلاش کنید."
};

type Card = {
  id: string;
  rank: string;
  suit: string;
  label: string;
  faSuit: string;
  symbol: string;
  color: string;
  value: number;
};

type PlayerInput = {
  playerId: string;
  playerSecret: string;
  playerName: string;
};

type RoomRow = Record<string, any>;
type PrivateState = {
  deck: Card[];
  hands: Record<string, Card[]>;
  internal_state: Record<string, any>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("server_error", 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRoleKey) return errorResponse("server_error", 500);

    const db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const body = await req.json();
    const action = String(body.action || "");

    await expireOldRooms(db);

    switch (action) {
      case "create_room":
        return await createRoom(db, body);
      case "join_room":
        return await joinRoom(db, body);
      case "get_view":
        return await getViewAction(db, body);
      case "heartbeat":
        return await heartbeat(db, body);
      case "leave_room":
        return await leaveRoom(db, body);
      case "start_hand":
        return await startHandAction(db, body);
      case "select_trump":
        return await selectTrumpAction(db, body);
      case "play_card":
        return await playCardAction(db, body);
      case "start_next_round":
        return await startNextRoundAction(db, body);
      case "cancel_room":
        return await cancelRoom(db, body);
      case "expire_room":
        return await expireRoomAction(db, body);
      case "set_rounds_target":
        return await setRoundsTarget(db, body);
      default:
        return errorResponse("server_error", 400);
    }
  } catch (error) {
    if (isHokmError(error)) return errorResponse(error.hokmCode, error.status);
    console.error("hokm-action failed", error);
    return errorResponse("server_error", 500);
  }
});

async function createRoom(db: any, body: any) {
  const player = normalizePlayer(body.player);
  if (!player) return errorResponse("invalid_player", 400);
  const roundsTarget = normalizeRoundsTarget(body.roundsTarget);
  if (!roundsTarget) return errorResponse("invalid_rounds_target", 400);

  const playerSecretHash = await hashPlayerSecret(player);
  const expiresAt = addHours(new Date(), ROOM_LIFETIME_HOURS).toISOString();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createRoomCode();
    const hostSeat = publicSeat(1, player, true);
    const publicState = {
      ...createInitialPublicState(roundsTarget),
      seats: [hostSeat]
    };

    const { data: room, error: roomError } = await db
      .from("hokm_rooms")
      .insert({
        code,
        status: "lobby",
        rounds_target: roundsTarget,
        host_player_id: player.playerId,
        public_state: publicState,
        expires_at: expiresAt
      })
      .select("*")
      .single();

    if (roomError) {
      if (roomError.code === "23505") continue;
      console.error("create room insert failed", roomError);
      return errorResponse("server_error", 500);
    }

    const { error: playerError } = await db.from("hokm_players").insert({
      room_id: room.id,
      seat: 1,
      player_id: player.playerId,
      player_secret_hash: playerSecretHash,
      name: player.playerName,
      is_host: true,
      connected: true,
      last_seen_at: nowIso()
    });

    if (playerError) {
      console.error("create room player insert failed", playerError);
      return errorResponse("server_error", 500);
    }

    const { error: privateError } = await db.from("hokm_private_state").insert({
      room_id: room.id,
      deck: [],
      hands: createEmptyHands(),
      internal_state: {}
    });

    if (privateError) {
      console.error("create private state failed", privateError);
      return errorResponse("server_error", 500);
    }

    const event = await insertEvent(db, room, player.playerId, "room_created", { seat: 1 });
    return await responseWithView(db, room, player, event);
  }

  return errorResponse("code_generation_failed", 409);
}

async function joinRoom(db: any, body: any) {
  const player = normalizePlayer(body.player);
  if (!player) return errorResponse("invalid_player", 400);
  const code = normalizeCode(body.code);
  if (!code) return errorResponse("invalid_code", 400);

  const room = await loadRoom(db, code);
  if (!room) return errorResponse("room_not_found", 404);
  if (isExpired(room)) {
    await setRoomExpired(db, room);
    return errorResponse("room_expired", 410);
  }

  const players = await loadPlayers(db, room.id);
  const existing = players.find((item: any) => item.player_id === player.playerId);
  const playerSecretHash = await hashPlayerSecret(player);

  if (existing) {
    if (existing.player_secret_hash !== playerSecretHash) return errorResponse("invalid_player", 403);
    await db
      .from("hokm_players")
      .update({ name: player.playerName, connected: true, last_seen_at: nowIso() })
      .eq("id", existing.id);
    const nextRoom = await syncRoomSeats(db, room);
    return await responseWithView(db, nextRoom, player);
  }

  if (room.status !== "lobby") return errorResponse("invalid_phase", 409);
  if (players.length >= 4) return errorResponse("room_full", 409);

  const seat = firstOpenSeat(players);
  if (!seat) return errorResponse("room_full", 409);

  const { error: insertError } = await db.from("hokm_players").insert({
    room_id: room.id,
    seat,
    player_id: player.playerId,
    player_secret_hash: playerSecretHash,
    name: player.playerName,
    is_host: false,
    connected: true,
    last_seen_at: nowIso()
  });

  if (insertError) {
    console.error("join player insert failed", insertError);
    return insertError.code === "23505" ? errorResponse("room_full", 409) : errorResponse("server_error", 500);
  }

  const nextRoom = await syncRoomSeats(db, room);
  const event = await insertEvent(db, nextRoom, player.playerId, "player_joined", { seat });
  return await responseWithView(db, nextRoom, player, event);
}

async function getViewAction(db: any, body: any) {
  const code = normalizeCode(body.code);
  if (!code) return errorResponse("invalid_code", 400);
  const player = normalizePlayer(body.player, false);
  const room = await loadRoom(db, code);
  if (!room) return errorResponse("room_not_found", 404);
  const freshRoom = await applyDueTimeouts(db, room);
  return await responseWithView(db, freshRoom, player);
}

async function heartbeat(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);
  if (isExpired(room)) {
    await setRoomExpired(db, room);
    return errorResponse("room_expired", 410);
  }

  await db
    .from("hokm_players")
    .update({ connected: true, last_seen_at: nowIso(), name: player.playerName })
    .eq("id", playerRow.id);

  const freshRoom = await syncRoomSeats(db, room);
  return await responseWithView(db, freshRoom, player);
}

async function leaveRoom(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);

  if (room.status === "lobby") {
    if (playerRow.is_host) {
      const nextState = { ...(room.public_state || {}), phase: "cancelled", seats: [] };
      const nextRoom = await updateRoomOnly(db, room, "cancelled", nextState);
      const event = await insertEvent(db, nextRoom, player.playerId, "room_cancelled", {});
      return await responseWithView(db, nextRoom, player, event);
    }

    await db.from("hokm_players").delete().eq("id", playerRow.id);
    const nextRoom = await syncRoomSeats(db, room);
    const event = await insertEvent(db, nextRoom, player.playerId, "player_left", { seat: playerRow.seat });
    return await responseWithView(db, nextRoom, player, event);
  }

  await db.from("hokm_players").update({ connected: false, last_seen_at: nowIso() }).eq("id", playerRow.id);
  const nextRoom = await syncRoomSeats(db, room);
  const event = await insertEvent(db, nextRoom, player.playerId, "player_disconnected", { seat: playerRow.seat });
  return await responseWithView(db, nextRoom, player, event);
}

async function setRoundsTarget(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);
  if (!playerRow.is_host) return errorResponse("not_host", 403);
  if (room.status !== "lobby") return errorResponse("invalid_phase", 409);

  const roundsTarget = normalizeRoundsTarget(body.roundsTarget);
  if (!roundsTarget) return errorResponse("invalid_rounds_target", 400);

  const publicState = {
    ...(room.public_state || createInitialPublicState(roundsTarget)),
    roundsTarget
  };
  const { data: nextRoom, error } = await db
    .from("hokm_rooms")
    .update({
      rounds_target: roundsTarget,
      public_state: publicState,
      state_version: Number(room.state_version || 1) + 1,
      updated_at: nowIso()
    })
    .eq("id", room.id)
    .eq("state_version", room.state_version)
    .select("*")
    .single();

  if (error) return errorResponse("state_conflict", 409);
  return await responseWithView(db, nextRoom, player);
}

async function startHandAction(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);
  if (!playerRow.is_host) return errorResponse("not_host", 403);
  if (!["lobby", "round_ended"].includes(room.status)) return errorResponse("invalid_phase", 409);

  const players = await loadPlayers(db, room.id);
  if (players.length < 4) return errorResponse("invalid_phase", 409);

  const next = buildNewHand(room, room.status === "round_ended" ? room.public_state?.nextHakimSeat : null);
  const nextRoom = await saveStateChange(db, room, next.privateState, next.publicState, "trump_selection");
  const event = await insertEvent(db, nextRoom, player.playerId, "hand_started", {
    hakimSeat: next.publicState.hakimSeat,
    handNumber: next.publicState.handNumber
  });
  return await responseWithView(db, nextRoom, player, event);
}

async function selectTrumpAction(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);
  const freshRoom = await applyDueTimeouts(db, room);
  if (freshRoom.status !== "trump_selection") return errorResponse("invalid_phase", 409);
  if (Number(freshRoom.public_state?.hakimSeat) !== Number(playerRow.seat)) return errorResponse("not_hakim", 403);

  const suit = String(body.suit || "");
  if (!SUITS.includes(suit as any)) return errorResponse("invalid_phase", 400);

  const privateState = await loadPrivateState(db, freshRoom.id);
  const next = applyTrumpSelection(freshRoom, privateState, suit);
  const nextRoom = await saveStateChange(db, freshRoom, next.privateState, next.publicState, "playing");
  const event = await insertEvent(db, nextRoom, player.playerId, "trump_selected", { suit });
  return await responseWithView(db, nextRoom, player, event);
}

async function playCardAction(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);
  const freshRoom = await applyDueTimeouts(db, room);
  if (freshRoom.status !== "playing") return errorResponse("invalid_phase", 409);
  if (Number(freshRoom.public_state?.currentTurnSeat) !== Number(playerRow.seat)) {
    return errorResponse("not_your_turn", 403);
  }

  const privateState = await loadPrivateState(db, freshRoom.id);
  const result = applyCardPlay(freshRoom, privateState, playerRow.seat, String(body.cardId || ""));
  if (!result.ok) return errorResponse(result.error, result.error === "illegal_card" ? 422 : 409);

  const nextRoom = await saveStateChange(db, freshRoom, result.privateState, result.publicState, result.status);
  const event = await insertEvent(db, nextRoom, player.playerId, result.eventType, result.eventPayload);
  return await responseWithView(db, nextRoom, player, event);
}

async function startNextRoundAction(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);
  if (!playerRow.is_host) return errorResponse("not_host", 403);
  if (room.status !== "round_ended") return errorResponse("invalid_phase", 409);

  const next = buildNewHand(room, room.public_state?.nextHakimSeat);
  const nextRoom = await saveStateChange(db, room, next.privateState, next.publicState, "trump_selection");
  const event = await insertEvent(db, nextRoom, player.playerId, "hand_started", {
    hakimSeat: next.publicState.hakimSeat,
    handNumber: next.publicState.handNumber
  });
  return await responseWithView(db, nextRoom, player, event);
}

async function cancelRoom(db: any, body: any) {
  const { room, player, playerRow } = await loadRoomAndPlayer(db, body);
  if (!room || !player || !playerRow) return errorResponse("invalid_player", 403);
  if (!playerRow.is_host) return errorResponse("not_host", 403);
  const nextState = { ...(room.public_state || {}), phase: "cancelled", turnDeadlineAt: null };
  const nextRoom = await updateRoomOnly(db, room, "cancelled", nextState);
  const event = await insertEvent(db, nextRoom, player.playerId, "room_cancelled", {});
  return await responseWithView(db, nextRoom, player, event);
}

async function expireRoomAction(db: any, body: any) {
  const code = normalizeCode(body.code);
  if (!code) return errorResponse("invalid_code", 400);
  const player = normalizePlayer(body.player, false);
  const room = await loadRoom(db, code);
  if (!room) return errorResponse("room_not_found", 404);
  if (!isExpired(room)) return await responseWithView(db, room, player);
  const nextRoom = await setRoomExpired(db, room);
  return await responseWithView(db, nextRoom, player);
}

async function loadRoomAndPlayer(db: any, body: any) {
  const code = normalizeCode(body.code);
  const player = normalizePlayer(body.player);
  if (!code) throw createHokmError("invalid_code", 400);
  if (!player) throw createHokmError("invalid_player", 403);
  let room = await loadRoom(db, code);
  if (!room) throw createHokmError("room_not_found", 404);
  if (isExpired(room)) {
    await setRoomExpired(db, room);
    throw createHokmError("room_expired", 410);
  }
  room = await applyDueTimeouts(db, room);
  const playerRow = await loadPlayerRow(db, room.id, player);
  if (!playerRow) throw createHokmError("invalid_player", 403);
  return { room, player, playerRow };
}

async function responseWithView(db: any, room: RoomRow, player: PlayerInput | null, event: any = null) {
  const players = await loadPlayers(db, room.id);
  const privateState = await loadPrivateState(db, room.id, false);
  const playerRow = player ? await loadPlayerRow(db, room.id, player, false) : null;
  const publicRoom = publicRoomFromRow(room, players);
  const view = buildPlayerView(publicRoom, privateState, playerRow);
  return jsonResponse({ ok: true, room: publicRoom, view, event });
}

function buildPlayerView(room: any, privateState: PrivateState | null, playerRow: any) {
  const state = room.publicState || {};
  const currentSeat = playerRow?.seat ? Number(playerRow.seat) : null;
  const hand = currentSeat && privateState?.hands ? privateState.hands[String(currentSeat)] || [] : [];
  const legalCards = currentSeat && room.status === "playing" && Number(state.currentTurnSeat) === currentSeat
    ? getLegalCards(hand, state.currentTrick || [])
    : [];
  const allowedActions = [];

  if (!currentSeat && room.status === "lobby" && room.seats.length < 4) allowedActions.push("join_room");
  if (currentSeat) allowedActions.push("leave_room", "heartbeat");
  if (playerRow?.is_host && room.status === "lobby" && room.seats.length === 4) allowedActions.push("start_hand");
  if (playerRow?.is_host && room.status === "lobby") allowedActions.push("set_rounds_target", "cancel_room");
  if (playerRow?.is_host && room.status === "round_ended") allowedActions.push("start_next_round");
  if (currentSeat && room.status === "trump_selection" && Number(state.hakimSeat) === currentSeat) {
    allowedActions.push("select_trump");
  }
  if (currentSeat && room.status === "playing" && Number(state.currentTurnSeat) === currentSeat) {
    allowedActions.push("play_card");
  }

  return {
    currentSeat,
    isHost: Boolean(playerRow?.is_host),
    isHakim: Boolean(currentSeat && Number(state.hakimSeat) === currentSeat),
    hand: sortHand(hand, state.trumpSuit || ""),
    legalCardIds: legalCards.map((card) => card.id),
    allowedActions,
    serverNow: nowIso()
  };
}

async function applyDueTimeouts(db: any, room: RoomRow) {
  if (!["trump_selection", "playing"].includes(room.status)) return room;
  const deadlineAt = room.public_state?.turnDeadlineAt;
  if (!deadlineAt || new Date(deadlineAt).getTime() > Date.now()) return room;

  const privateState = await loadPrivateState(db, room.id);

  if (room.status === "trump_selection") {
    const hakimSeat = String(room.public_state?.hakimSeat || "");
    const suit = chooseAutoTrump(privateState.hands?.[hakimSeat] || []);
    const next = applyTrumpSelection(room, privateState, suit);
    const nextRoom = await saveStateChange(db, room, next.privateState, next.publicState, "playing");
    await insertEvent(db, nextRoom, null, "auto_trump", { suit });
    return nextRoom;
  }

  const seat = Number(room.public_state?.currentTurnSeat);
  const hand = privateState.hands?.[String(seat)] || [];
  const card = chooseAutoPlayCard(hand, room.public_state?.currentTrick || [], room.public_state?.trumpSuit || "");
  if (!card) return room;

  const result = applyCardPlay(room, privateState, seat, card.id);
  if (!result.ok) return room;
  const nextRoom = await saveStateChange(db, room, result.privateState, result.publicState, result.status);
  await insertEvent(db, nextRoom, null, "auto_play", { seat, cardId: card.id });
  return nextRoom;
}

function buildNewHand(room: RoomRow, preferredHakimSeat: number | null = null) {
  const publicState = room.public_state || createInitialPublicState(room.rounds_target);
  const deck = shuffleDeck(createDeck(), `${room.id}:${Date.now()}:${Math.random()}`);
  const hakimSeat = Number(preferredHakimSeat) || randomSeat();
  const deal = dealFirstFive(deck, hakimSeat);
  const handCounts = countHands(deal.hands);

  return {
    privateState: {
      deck: deal.deck,
      hands: deal.hands,
      internal_state: { lastDealAt: nowIso() }
    },
    publicState: {
      ...publicState,
      phase: "trump_selection",
      handNumber: Number(publicState.handNumber || 0) + 1,
      hakimSeat,
      nextHakimSeat: hakimSeat,
      currentTurnSeat: hakimSeat,
      turnSeat: hakimSeat,
      turnDeadlineAt: addSeconds(new Date(), TRUMP_SECONDS).toISOString(),
      trumpSuit: "",
      currentTrick: [],
      lastTrick: [],
      lastTrickWinnerSeat: null,
      trickHistory: [],
      handCounts,
      tricks: { team1: 0, team2: 0 },
      roundWinnerTeam: "",
      matchWinnerTeam: "",
      message: "select_trump"
    }
  };
}

function applyTrumpSelection(room: RoomRow, privateState: PrivateState, suit: string) {
  const publicState = room.public_state || {};
  const dealt = dealRemainingCards(privateState.deck || [], privateState.hands || createEmptyHands(), suit);
  return {
    privateState: {
      ...privateState,
      deck: dealt.deck,
      hands: dealt.hands,
      internal_state: { ...(privateState.internal_state || {}), trumpSelectedAt: nowIso() }
    },
    publicState: {
      ...publicState,
      phase: "playing",
      trumpSuit: suit,
      currentTurnSeat: publicState.hakimSeat,
      turnSeat: publicState.hakimSeat,
      turnDeadlineAt: addSeconds(new Date(), TURN_SECONDS).toISOString(),
      handCounts: countHands(dealt.hands),
      message: "trump_selected"
    }
  };
}

function applyCardPlay(room: RoomRow, privateState: PrivateState, seat: number, cardId: string): any {
  const publicState = room.public_state || {};
  const playerSeat = String(seat);
  const hands = cloneHands(privateState.hands);
  const hand = hands[playerSeat] || [];
  const card = hand.find((item) => item.id === cardId);
  if (!card) return { ok: false, error: "illegal_card" };
  if (!canPlayCard(hand, card, publicState.currentTrick || [])) return { ok: false, error: "illegal_card" };

  hands[playerSeat] = hand.filter((item) => item.id !== cardId);
  const currentTrick = [...(publicState.currentTrick || []), { seat, card }];
  const nextPrivateState = {
    ...privateState,
    hands,
    internal_state: { ...(privateState.internal_state || {}), lastPlayAt: nowIso() }
  };

  if (currentTrick.length < 4) {
    return {
      ok: true,
      status: "playing",
      eventType: "card_played",
      eventPayload: { seat, cardId },
      privateState: nextPrivateState,
      publicState: {
        ...publicState,
        phase: "playing",
        currentTrick,
        currentTurnSeat: getNextSeat(seat),
        turnSeat: getNextSeat(seat),
        turnDeadlineAt: addSeconds(new Date(), TURN_SECONDS).toISOString(),
        handCounts: countHands(hands),
        message: "card_played"
      }
    };
  }

  const winner = resolveTrickWinner(currentTrick, publicState.trumpSuit || "");
  const winningTeam = getTeamForSeat(winner.seat);
  const tricks = {
    team1: Number(publicState.tricks?.team1 || 0),
    team2: Number(publicState.tricks?.team2 || 0)
  };
  tricks[winningTeam] += 1;

  const trickHistory = [...(publicState.trickHistory || []), { cards: currentTrick, winnerSeat: winner.seat }];
  const roundWinnerTeam = getRoundWinner(tricks.team1, tricks.team2);
  const baseState = {
    ...publicState,
    tricks,
    currentTrick: [],
    lastTrick: currentTrick,
    lastTrickWinnerSeat: winner.seat,
    currentTurnSeat: winner.seat,
    turnSeat: winner.seat,
    turnDeadlineAt: addSeconds(new Date(), TURN_SECONDS).toISOString(),
    trickHistory,
    handCounts: countHands(hands),
    message: "trick_won"
  };

  if (!roundWinnerTeam) {
    return {
      ok: true,
      status: "playing",
      eventType: "trick_won",
      eventPayload: { winnerSeat: winner.seat, winningTeam },
      privateState: nextPrivateState,
      publicState: baseState
    };
  }

  const rounds = {
    team1: Number(publicState.rounds?.team1 || 0),
    team2: Number(publicState.rounds?.team2 || 0)
  };
  rounds[roundWinnerTeam] += 1;
  const nextHakimSeat = roundWinnerTeam === getTeamForSeat(publicState.hakimSeat)
    ? publicState.hakimSeat
    : getNextSeat(publicState.hakimSeat);
  const matchFinished = isMatchFinished(rounds.team1, rounds.team2, room.rounds_target);

  return {
    ok: true,
    status: matchFinished ? "match_finished" : "round_ended",
    eventType: matchFinished ? "match_finished" : "round_won",
    eventPayload: { roundWinnerTeam, matchWinnerTeam: matchFinished ? roundWinnerTeam : "" },
    privateState: nextPrivateState,
    publicState: {
      ...baseState,
      phase: matchFinished ? "match_finished" : "round_ended",
      rounds,
      roundWinnerTeam,
      matchWinnerTeam: matchFinished ? roundWinnerTeam : "",
      nextHakimSeat,
      currentTurnSeat: null,
      turnSeat: null,
      turnDeadlineAt: null,
      message: matchFinished ? "match_finished" : "round_won"
    }
  };
}

async function saveStateChange(
  db: any,
  room: RoomRow,
  privateState: PrivateState,
  publicState: Record<string, any>,
  status: string
) {
  const { data: nextRoom, error: roomError } = await db
    .from("hokm_rooms")
    .update({
      status,
      public_state: publicState,
      state_version: Number(room.state_version || 1) + 1,
      updated_at: nowIso()
    })
    .eq("id", room.id)
    .eq("state_version", room.state_version)
    .select("*")
    .single();

  if (roomError || !nextRoom) {
    console.error("state version conflict", roomError);
    throw createHokmError("state_conflict", 409);
  }

  const { error: privateError } = await db
    .from("hokm_private_state")
    .update({
      deck: privateState.deck || [],
      hands: privateState.hands || createEmptyHands(),
      internal_state: privateState.internal_state || {},
      updated_at: nowIso()
    })
    .eq("room_id", room.id);

  if (privateError) {
    console.error("private state update failed", privateError);
    throw privateError;
  }

  return nextRoom;
}

async function updateRoomOnly(db: any, room: RoomRow, status: string, publicState: Record<string, any>) {
  const { data: nextRoom, error } = await db
    .from("hokm_rooms")
    .update({
      status,
      public_state: publicState,
      state_version: Number(room.state_version || 1) + 1,
      updated_at: nowIso()
    })
    .eq("id", room.id)
    .eq("state_version", room.state_version)
    .select("*")
    .single();

  if (error || !nextRoom) throw createHokmError("state_conflict", 409);
  return nextRoom;
}

async function syncRoomSeats(db: any, room: RoomRow) {
  const players = await loadPlayers(db, room.id);
  const publicState = {
    ...(room.public_state || createInitialPublicState(room.rounds_target)),
    seats: seatsFromPlayers(players)
  };
  try {
    return await updateRoomOnly(db, room, room.status, publicState);
  } catch (error) {
    if (!isHokmError(error) || error.hokmCode !== "state_conflict") throw error;
    const latestRoom = await loadRoomById(db, room.id);
    if (!latestRoom) throw error;
    const latestPlayers = await loadPlayers(db, room.id);
    return await updateRoomOnly(db, latestRoom, latestRoom.status, {
      ...(latestRoom.public_state || createInitialPublicState(latestRoom.rounds_target)),
      seats: seatsFromPlayers(latestPlayers)
    });
  }
}

async function setRoomExpired(db: any, room: RoomRow) {
  const nextState = { ...(room.public_state || {}), phase: "expired", turnDeadlineAt: null };
  return await updateRoomOnly(db, room, "expired", nextState);
}

async function expireOldRooms(db: any) {
  await db
    .from("hokm_rooms")
    .update({
      status: "expired",
      updated_at: nowIso()
    })
    .in("status", ACTIVE_STATUSES)
    .lte("expires_at", nowIso());
}

async function loadRoom(db: any, code: string) {
  const { data, error } = await db
    .from("hokm_rooms")
    .select("*")
    .eq("code", code)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function loadRoomById(db: any, roomId: string) {
  const { data, error } = await db
    .from("hokm_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadPlayers(db: any, roomId: string) {
  const { data, error } = await db
    .from("hokm_players")
    .select("*")
    .eq("room_id", roomId)
    .order("seat", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadPlayerRow(db: any, roomId: string, player: PlayerInput, strict = true) {
  const { data, error } = await db
    .from("hokm_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("player_id", player.playerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return strict ? null : null;
  const hash = await hashPlayerSecret(player);
  if (data.player_secret_hash !== hash) return strict ? null : null;
  return data;
}

async function loadPrivateState(db: any, roomId: string, required = true): Promise<PrivateState | null> {
  const { data, error } = await db
    .from("hokm_private_state")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw error;
  if (!data && required) throw new Error("private_state_missing");
  if (!data) return null;
  return {
    deck: Array.isArray(data.deck) ? data.deck : [],
    hands: data.hands || createEmptyHands(),
    internal_state: data.internal_state || {}
  };
}

async function insertEvent(db: any, room: RoomRow, playerId: string | null, eventType: string, payload: Record<string, any>) {
  const { data } = await db
    .from("hokm_events")
    .insert({ room_id: room.id, code: room.code, player_id: playerId, event_type: eventType, payload })
    .select("*")
    .single();
  return data || { eventType, payload };
}

function publicRoomFromRow(room: RoomRow, players: any[]) {
  const publicState = {
    ...(room.public_state || createInitialPublicState(room.rounds_target)),
    seats: seatsFromPlayers(players)
  };

  return {
    id: room.id,
    code: room.code,
    status: room.status,
    roundsTarget: Number(room.rounds_target || publicState.roundsTarget || 3),
    hostPlayerId: room.host_player_id,
    publicState,
    seats: publicState.seats,
    stateVersion: Number(room.state_version || 1),
    expiresAt: room.expires_at,
    createdAt: room.created_at,
    updatedAt: room.updated_at
  };
}

function createInitialPublicState(roundsTarget: number) {
  return {
    phase: "lobby",
    roundsTarget,
    seats: [],
    handNumber: 0,
    hakimSeat: null,
    nextHakimSeat: null,
    currentTurnSeat: null,
    turnSeat: null,
    turnDeadlineAt: null,
    trumpSuit: "",
    currentTrick: [],
    lastTrick: [],
    lastTrickWinnerSeat: null,
    trickHistory: [],
    handCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    tricks: { team1: 0, team2: 0 },
    rounds: { team1: 0, team2: 0 },
    roundWinnerTeam: "",
    matchWinnerTeam: "",
    message: ""
  };
}

function createDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => {
      const meta = SUIT_META[suit];
      const value = getCardRankValue(rank);
      return {
        id: `${rank}${suit[0].toUpperCase()}`,
        rank,
        suit,
        label: `${rank}${meta.symbol}`,
        faSuit: meta.faSuit,
        symbol: meta.symbol,
        color: meta.color,
        value
      };
    })
  );
}

function shuffleDeck(deck: Card[], seed = "") {
  const next = [...deck];
  const random = seed ? seededRandom(seed) : Math.random;

  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }

  return next;
}

function sortHand(hand: Card[] = [], trumpSuit = "") {
  const suitOrder = trumpSuit
    ? [...SUITS.filter((suit) => suit !== trumpSuit), trumpSuit]
    : [...SUITS];

  return [...hand].sort((a, b) => {
    const suitDelta = suitOrder.indexOf(a.suit as any) - suitOrder.indexOf(b.suit as any);
    return suitDelta || b.value - a.value;
  });
}

function getCardRankValue(rank: string) {
  const faceValues: Record<string, number> = { J: 11, Q: 12, K: 13, A: 14 };
  return faceValues[rank] || Number(rank);
}

function dealFirstFive(deck: Card[], hakimSeat: number) {
  const nextDeck = [...deck];
  const hands = createEmptyHands();
  hands[String(hakimSeat)] = nextDeck.splice(0, 5);
  return { deck: nextDeck, hands };
}

function dealRemainingCards(deck: Card[], hands: Record<string, Card[]>, trumpSuit = "") {
  const nextDeck = [...deck];
  const nextHands = cloneHands(hands);

  while (nextDeck.length && Object.values(nextHands).some((hand) => hand.length < 13)) {
    for (const seat of ["1", "2", "3", "4"]) {
      if (!nextDeck.length) break;
      if (nextHands[seat].length < 13) nextHands[seat].push(nextDeck.shift() as Card);
    }
  }

  return {
    deck: nextDeck,
    hands: Object.fromEntries(Object.entries(nextHands).map(([seat, hand]) => [seat, sortHand(hand, trumpSuit)]))
  };
}

function getLegalCards(hand: Card[] = [], currentTrick: any[] = []) {
  const ledSuit = currentTrick[0]?.card?.suit || "";
  if (!currentTrick.length || !ledSuit) return hand;
  const matchingSuit = hand.filter((card) => card.suit === ledSuit);
  return matchingSuit.length ? matchingSuit : hand;
}

function canPlayCard(hand: Card[], card: Card, currentTrick: any[]) {
  return getLegalCards(hand, currentTrick).some((legalCard) => legalCard.id === card.id);
}

function resolveTrickWinner(currentTrick: any[] = [], trumpSuit = "") {
  const ledSuit = currentTrick[0]?.card?.suit || "";
  const trumpCards = currentTrick.filter((play) => play.card.suit === trumpSuit);
  const candidates = trumpCards.length
    ? trumpCards
    : currentTrick.filter((play) => play.card.suit === ledSuit);
  return candidates.reduce((winner, play) => (play.card.value > winner.card.value ? play : winner), candidates[0]);
}

function chooseAutoTrump(hand: Card[] = []) {
  const scores: Record<string, number> = Object.fromEntries(SUITS.map((suit) => [suit, 0]));
  for (const card of hand) scores[card.suit] += 1 + Math.max(0, card.value - 10) * 0.2;
  return SUITS.reduce((best, suit) => (scores[suit] > scores[best] ? suit : best), SUITS[0]);
}

function chooseAutoPlayCard(hand: Card[] = [], currentTrick: any[] = [], trumpSuit = "") {
  const legalCards = getLegalCards(hand, currentTrick);
  if (!legalCards.length) return null;
  return [...legalCards].sort((a, b) => {
    const trumpDelta = Number(a.suit === trumpSuit) - Number(b.suit === trumpSuit);
    return trumpDelta || a.value - b.value;
  })[0];
}

function getTeamForSeat(seat: number) {
  return Number(seat) === 1 || Number(seat) === 3 ? "team1" : "team2";
}

function getNextSeat(seat: number) {
  return Number(seat) === 4 ? 1 : Number(seat) + 1;
}

function getRoundWinner(team1Tricks: number, team2Tricks: number) {
  if (team1Tricks >= 7) return "team1";
  if (team2Tricks >= 7) return "team2";
  return "";
}

function isMatchFinished(team1Rounds: number, team2Rounds: number, roundsTarget: number) {
  return team1Rounds >= roundsTarget || team2Rounds >= roundsTarget;
}

function cloneHands(hands: Record<string, Card[]> = {}) {
  return {
    1: [...(hands[1] || hands["1"] || [])],
    2: [...(hands[2] || hands["2"] || [])],
    3: [...(hands[3] || hands["3"] || [])],
    4: [...(hands[4] || hands["4"] || [])]
  };
}

function createEmptyHands() {
  return { 1: [], 2: [], 3: [], 4: [] };
}

function countHands(hands: Record<string, Card[]>) {
  return {
    1: hands["1"]?.length || 0,
    2: hands["2"]?.length || 0,
    3: hands["3"]?.length || 0,
    4: hands["4"]?.length || 0
  };
}

function seatsFromPlayers(players: any[]) {
  return players
    .map((player) => ({
      seat: Number(player.seat),
      playerId: player.player_id,
      playerName: player.name || "بازیکن",
      isHost: Boolean(player.is_host),
      connected: player.connected !== false && Date.now() - new Date(player.last_seen_at || player.joined_at).getTime() < 90000,
      lastSeenAt: player.last_seen_at,
      joinedAt: player.joined_at
    }))
    .sort((a, b) => a.seat - b.seat);
}

function publicSeat(seat: number, player: PlayerInput, isHost = false) {
  return {
    seat,
    playerId: player.playerId,
    playerName: player.playerName,
    isHost,
    connected: true,
    lastSeenAt: nowIso(),
    joinedAt: nowIso()
  };
}

function firstOpenSeat(players: any[]) {
  const taken = new Set(players.map((player) => Number(player.seat)));
  return [1, 2, 3, 4].find((seat) => !taken.has(seat)) || null;
}

function normalizeRoundsTarget(value: unknown) {
  const next = Number(value);
  return [3, 5, 7].includes(next) ? next : null;
}

function normalizeCode(value: unknown) {
  const raw = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  const code = raw.startsWith("H") ? raw : raw ? `H${raw.replace(/^H/i, "")}` : "";
  return /^H\d{4}$/.test(code) ? code : "";
}

function normalizePlayer(value: any, required = true): PlayerInput | null {
  const playerId = String(value?.playerId || "").trim();
  const playerSecret = String(value?.playerSecret || "").trim();
  const playerName = String(value?.playerName || "بازیکن").trim().slice(0, 32) || "بازیکن";
  if (!playerId || !playerSecret) return required ? null : null;
  return { playerId, playerSecret, playerName };
}

async function hashPlayerSecret(player: PlayerInput) {
  const bytes = new TextEncoder().encode(`${player.playerId}:${player.playerSecret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createRoomCode() {
  return `H${Math.floor(1000 + Math.random() * 9000)}`;
}

function randomSeat() {
  return Math.floor(Math.random() * 4) + 1;
}

function isExpired(room: RoomRow) {
  return room.status === "expired" || new Date(room.expires_at).getTime() <= Date.now();
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function nowIso() {
  return new Date().toISOString();
}

function seededRandom(seed: string) {
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

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function errorResponse(error: string, status = 400) {
  return jsonResponse({ ok: false, error, message: ERROR_MESSAGES[error] || ERROR_MESSAGES.server_error }, status);
}

function createHokmError(hokmCode: string, status = 400) {
  return Object.assign(new Error(hokmCode), { hokmCode, status });
}

function isHokmError(error: unknown): error is Error & { hokmCode: string; status: number } {
  return Boolean(error && typeof error === "object" && "hokmCode" in error);
}
