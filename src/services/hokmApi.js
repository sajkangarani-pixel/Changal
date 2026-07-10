import { supabase } from "./supabaseClient.js?v=20260710-hokm-online2";

const PLAYER_ID_KEY = "changal_hokm_player_id";
const PLAYER_SECRET_KEY = "changal_hokm_player_secret";
const PLAYER_NAME_KEY = "changal_hokm_player_name";
const ACTIVE_STATUSES = new Set(["lobby", "trump_selection", "playing", "round_ended"]);

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
  return String(code || "").trim().toUpperCase();
}

export async function createHokmRoom(player, roundsTarget = 3) {
  const result = await callHokmRpc("create_hokm_room", {
    p_player_id: player.playerId,
    p_player_secret: player.playerSecret,
    p_player_name: normalizePlayerName(player.playerName),
    p_rounds_target: Number(roundsTarget) || 3
  });
  return normalizeHokmRoom(result.room);
}

export async function joinHokmRoom(code, player) {
  const result = await callHokmRpc("join_hokm_room", {
    p_code: normalizeHokmCode(code),
    p_player_id: player.playerId,
    p_player_secret: player.playerSecret,
    p_player_name: normalizePlayerName(player.playerName)
  });
  return normalizeHokmRoom(result.room);
}

export async function leaveHokmRoom(code, player) {
  const result = await callHokmRpc("leave_hokm_room", {
    p_code: normalizeHokmCode(code),
    p_player_id: player.playerId,
    p_player_secret: player.playerSecret
  });
  return normalizeHokmRoom(result.room);
}

export async function updateHokmRoomSettings(code, player, roundsTarget) {
  const result = await callHokmRpc("update_hokm_room_settings", {
    p_code: normalizeHokmCode(code),
    p_player_id: player.playerId,
    p_player_secret: player.playerSecret,
    p_rounds_target: Number(roundsTarget) || 3
  });
  return normalizeHokmRoom(result.room);
}

export async function updateHokmRoomState({ code, player, expectedVersion, nextState, nextStatus }) {
  const result = await callHokmRpc("update_hokm_room_state", {
    p_code: normalizeHokmCode(code),
    p_player_id: player.playerId,
    p_player_secret: player.playerSecret,
    p_expected_state_version: Number(expectedVersion),
    p_next_state: nextState,
    p_next_status: nextStatus
  });
  return normalizeHokmRoom(result.room);
}

export async function expireHokmRoom(code) {
  const result = await callHokmRpc("expire_hokm_room", {
    p_code: normalizeHokmCode(code)
  });
  return result.room ? normalizeHokmRoom(result.room) : null;
}

export async function fetchHokmRoom(code) {
  const normalizedCode = normalizeHokmCode(code);
  if (!normalizedCode) return null;

  const { data, error } = await supabase
    .from("hokm_rooms")
    .select("*")
    .eq("code", normalizedCode)
    .in("status", ["lobby", "trump_selection", "playing", "round_ended", "finished", "expired"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(mapHokmError(error.message));
  return data?.[0] ? normalizeHokmRoom(data[0]) : null;
}

export function subscribeToHokmRoom(code, onRoom, onError = () => {}) {
  const normalizedCode = normalizeHokmCode(code);
  if (!normalizedCode) return () => {};

  const channel = supabase
    .channel(`hokm-room-${normalizedCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "hokm_rooms",
        filter: `code=eq.${normalizedCode}`
      },
      (payload) => {
        if (payload.new) onRoom(normalizeHokmRoom(payload.new));
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        onError(new Error("ارتباط زنده قطع شد."));
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function normalizeHokmRoom(row = {}) {
  if (!row) return null;
  return {
    id: row.id || "",
    code: normalizeHokmCode(row.code),
    status: row.status || "lobby",
    hostPlayerId: row.host_player_id || "",
    roundsTarget: Number(row.rounds_target || row.state?.roundsTarget || 3),
    seats: normalizeSeats(row.seats),
    state: row.state && typeof row.state === "object" ? row.state : {},
    stateVersion: Number(row.state_version || 1),
    expiresAt: row.expires_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

export function isHokmRoomExpired(room) {
  if (!room) return false;
  if (room.status === "expired") return true;
  return room.expiresAt ? new Date(room.expiresAt).getTime() <= Date.now() : false;
}

export function isHokmRoomJoinable(room) {
  return Boolean(room && ACTIVE_STATUSES.has(room.status) && !isHokmRoomExpired(room));
}

export function getCurrentPlayerSeat(room, player) {
  const seat = room?.seats?.find((item) => item.playerId === player.playerId);
  return seat?.seat || null;
}

export function isHokmHost(room, player) {
  return Boolean(room?.hostPlayerId && room.hostPlayerId === player.playerId);
}

export function formatHokmTimeLeft(expiresAt) {
  if (!expiresAt) return "۰:۰۰";
  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${toPersianDigits(hours)}:${toPersianDigits(String(minutes).padStart(2, "0"))}`;
}

export function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function mapHokmError(error) {
  const key = String(error || "");
  const messages = {
    not_found: "میزی با این کد پیدا نشد.",
    expired: "زمان این میز تمام شده است.",
    full: "این میز کامل شده است.",
    forbidden: "اجازه انجام این کار را ندارید.",
    conflict: "خطای همگام‌سازی. بازی دوباره به‌روزرسانی شد.",
    code_generation_failed: "ساخت کد میز ناموفق بود. دوباره تلاش کنید.",
    invalid_rounds_target: "تعداد راند معتبر نیست."
  };
  return messages[key] || "ارتباط برقرار نشد. دوباره تلاش کنید.";
}

async function callHokmRpc(name, params) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(mapHokmError(error.message));
  if (!data?.ok) throw new Error(mapHokmError(data?.error));
  return data;
}

function normalizeSeats(value = []) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((seat) => ({
      seat: Number(seat.seat),
      playerId: String(seat.playerId || seat.player_id || ""),
      playerName: normalizePlayerName(seat.playerName || seat.player_name || "بازیکن"),
      connected: seat.connected !== false,
      joinedAt: seat.joinedAt || seat.joined_at || ""
    }))
    .filter((seat) => seat.seat >= 1 && seat.seat <= 4 && seat.playerId)
    .sort((a, b) => a.seat - b.seat);
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
