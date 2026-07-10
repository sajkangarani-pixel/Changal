import { supabase } from "./supabaseClient.js?v=20260710-hokm-stable1";

const PLAYER_ID_KEY = "changal_hokm_player_id";
const PLAYER_SECRET_KEY = "changal_hokm_player_secret";
const PLAYER_NAME_KEY = "changal_hokm_player_name";
const ACTIVE_STATUSES = new Set([
  "lobby",
  "dealing_first_five",
  "trump_selection",
  "dealing_remaining",
  "playing",
  "trick_resolution",
  "round_ended"
]);

export const HOKM_ACTIONS = [
  "create_room",
  "join_room",
  "get_view",
  "heartbeat",
  "leave_room",
  "start_hand",
  "select_trump",
  "play_card",
  "start_next_round",
  "cancel_room",
  "expire_room",
  "set_rounds_target"
];

export const HOKM_ERROR_MESSAGES = {
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

export function getHokmPlayer() {
  const storage = window.localStorage;
  let playerId = storage.getItem(PLAYER_ID_KEY);
  let playerSecret = storage.getItem(PLAYER_SECRET_KEY);
  let playerName = storage.getItem(PLAYER_NAME_KEY) || "";

  if (!playerId) {
    playerId = createRandomId("hp");
    storage.setItem(PLAYER_ID_KEY, playerId);
  }

  if (!playerSecret) {
    playerSecret = createRandomId("hs");
    storage.setItem(PLAYER_SECRET_KEY, playerSecret);
  }

  return {
    playerId,
    playerSecret,
    playerName
  };
}

export function saveHokmPlayerName(playerName) {
  const normalized = normalizePlayerName(playerName);
  window.localStorage.setItem(PLAYER_NAME_KEY, normalized);
  return { ...getHokmPlayer(), playerName: normalized };
}

export function normalizeHokmCode(code) {
  const value = String(code || "").trim().toUpperCase().replace(/\s+/g, "");
  return value.startsWith("H") ? value : value ? `H${value.replace(/^H/i, "")}` : "";
}

export async function createHokmRoom(player, roundsTarget = 3) {
  return invokeHokmAction("create_room", {
    player: normalizePlayer(player),
    roundsTarget: Number(roundsTarget) || 3
  });
}

export async function joinHokmRoom(code, player) {
  return invokeHokmAction("join_room", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export async function getHokmView(code, player) {
  return invokeHokmAction("get_view", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export async function heartbeatHokmRoom(code, player) {
  return invokeHokmAction("heartbeat", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export async function leaveHokmRoom(code, player) {
  return invokeHokmAction("leave_room", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export async function setHokmRoomRounds(code, player, roundsTarget) {
  return invokeHokmAction("set_rounds_target", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player),
    roundsTarget: Number(roundsTarget) || 3
  });
}

export async function startHokmHand(code, player) {
  return invokeHokmAction("start_hand", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export async function selectHokmTrump(code, player, suit) {
  return invokeHokmAction("select_trump", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player),
    suit
  });
}

export async function playHokmCard(code, player, cardId) {
  return invokeHokmAction("play_card", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player),
    cardId
  });
}

export async function startHokmNextRound(code, player) {
  return invokeHokmAction("start_next_round", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export async function cancelHokmRoom(code, player) {
  return invokeHokmAction("cancel_room", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export async function expireHokmRoom(code, player = getHokmPlayer()) {
  return invokeHokmAction("expire_room", {
    code: normalizeHokmCode(code),
    player: normalizePlayer(player)
  });
}

export function subscribeToHokmRoom(code, onChange, onError = () => {}) {
  const normalizedCode = normalizeHokmCode(code);
  if (!normalizedCode) return () => {};

  const roomChannel = supabase
    .channel(`hokm-room-${normalizedCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hokm_rooms",
        filter: `code=eq.${normalizedCode}`
      },
      () => {
        onChange();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "hokm_events",
        filter: `code=eq.${normalizedCode}`
      },
      (payload) => {
        onChange(payload.new || null);
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        onError(new Error("ارتباط زنده قطع شد."));
      }
    });

  return () => {
    supabase.removeChannel(roomChannel);
  };
}

export function getCurrentPlayerSeat(room, player) {
  const seat = room?.seats?.find((item) => item.playerId === player.playerId);
  return seat?.seat || null;
}

export function isHokmHost(room, player) {
  return Boolean(room?.hostPlayerId && room.hostPlayerId === player.playerId);
}

export function isHokmRoomExpired(room) {
  if (!room) return false;
  if (room.status === "expired") return true;
  return room.expiresAt ? new Date(room.expiresAt).getTime() <= Date.now() : false;
}

export function isHokmRoomJoinable(room) {
  return Boolean(room && ACTIVE_STATUSES.has(room.status) && !isHokmRoomExpired(room));
}

export function formatHokmTimeLeft(expiresAt, now = Date.now()) {
  if (!expiresAt) return "۰:۰۰";
  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${toPersianDigits(hours)}:${toPersianDigits(String(minutes).padStart(2, "0"))}`;
}

export function formatHokmCountdown(deadlineAt, now = Date.now()) {
  if (!deadlineAt) return "";
  const remainingSeconds = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${toPersianDigits(minutes)}:${toPersianDigits(String(seconds).padStart(2, "0"))}`;
}

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function mapHokmError(error) {
  const key = String(error || "");
  return HOKM_ERROR_MESSAGES[key] || HOKM_ERROR_MESSAGES.network_error;
}

async function invokeHokmAction(action, body = {}) {
  if (!HOKM_ACTIONS.includes(action)) throw new Error(HOKM_ERROR_MESSAGES.server_error);

  const { data, error } = await supabase.functions.invoke("hokm-action", {
    body: { action, ...body }
  });

  if (error) throw new Error(HOKM_ERROR_MESSAGES.network_error);
  if (!data?.ok) throw new Error(mapHokmError(data?.error || "server_error"));
  return normalizeHokmResult(data);
}

function normalizeHokmResult(data = {}) {
  return {
    ok: true,
    room: normalizeHokmRoom(data.room),
    view: normalizeHokmView(data.view),
    event: data.event || null
  };
}

function normalizeHokmRoom(room = {}) {
  const publicState = room.publicState || room.public_state || {};
  const seats = normalizeSeats(room.seats || publicState.seats || []);
  return {
    id: room.id || "",
    code: normalizeHokmCode(room.code),
    status: room.status || publicState.phase || "lobby",
    hostPlayerId: room.hostPlayerId || room.host_player_id || "",
    roundsTarget: Number(room.roundsTarget || room.rounds_target || publicState.roundsTarget || 3),
    publicState: {
      ...publicState,
      phase: publicState.phase || room.status || "lobby",
      seats
    },
    seats,
    stateVersion: Number(room.stateVersion || room.state_version || 1),
    expiresAt: room.expiresAt || room.expires_at || "",
    createdAt: room.createdAt || room.created_at || "",
    updatedAt: room.updatedAt || room.updated_at || ""
  };
}

function normalizeHokmView(view = {}) {
  return {
    currentSeat: view.currentSeat ? Number(view.currentSeat) : null,
    isHost: Boolean(view.isHost),
    isHakim: Boolean(view.isHakim),
    hand: Array.isArray(view.hand) ? view.hand : [],
    legalCardIds: Array.isArray(view.legalCardIds) ? view.legalCardIds : [],
    allowedActions: Array.isArray(view.allowedActions) ? view.allowedActions : [],
    serverNow: view.serverNow || new Date().toISOString()
  };
}

function normalizeSeats(value = []) {
  return (Array.isArray(value) ? value : [])
    .map((seat) => ({
      seat: Number(seat.seat),
      playerId: String(seat.playerId || seat.player_id || ""),
      playerName: normalizePlayerName(seat.playerName || seat.player_name || "بازیکن"),
      isHost: Boolean(seat.isHost || seat.is_host),
      connected: seat.connected !== false,
      lastSeenAt: seat.lastSeenAt || seat.last_seen_at || "",
      joinedAt: seat.joinedAt || seat.joined_at || ""
    }))
    .filter((seat) => seat.seat >= 1 && seat.seat <= 4 && seat.playerId)
    .sort((a, b) => a.seat - b.seat);
}

function normalizePlayer(player = getHokmPlayer()) {
  return {
    playerId: player.playerId,
    playerSecret: player.playerSecret,
    playerName: normalizePlayerName(player.playerName)
  };
}

function normalizePlayerName(value) {
  return String(value || "بازیکن").trim().slice(0, 32) || "بازیکن";
}

function createRandomId(prefix) {
  if (crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return `${prefix}_${[...values].map((value) => value.toString(16)).join("")}`;
}
