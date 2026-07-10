import {
  formatHokmCountdown,
  formatHokmTimeLeft,
  isHokmRoomExpired,
  isHokmRoomJoinable,
  toPersianDigits
} from "../services/hokmApi.js?v=20260710-hokm-stable1";
import {
  HOKM_SUITS,
  getSuitLabel,
  getSuitSymbol,
  getTeamForSeat,
  rotateSeatsForPerspective,
  sortHand
} from "../services/hokmEngine.js?v=20260710-hokm-stable1";
import { escapeAttr, escapeHtml } from "./components.js?v=20260710-hokm-stable1";
import { icon } from "./icons.js?v=20260710-hokm-stable1";

const SEAT_POSITIONS = {
  1: "bottom",
  2: "right",
  3: "top",
  4: "left"
};

function seatPositionsFor(currentSeat) {
  if (!currentSeat) return SEAT_POSITIONS;
  const perspective = rotateSeatsForPerspective([1, 2, 3, 4], currentSeat);
  return Object.fromEntries(
    Object.entries(perspective).map(([position, seat]) => [Number(seat), position])
  );
}

export function HokmStartModal({ modal, player }) {
  if (!modal.open) return "";
  const isSetup = modal.mode === "setup";
  const room = modal.setupRoom;

  return `
    <section class="hokm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="hokm-start-title">
      <div class="hokm-start-sheet ${isSetup ? "is-setup" : ""}">
        <div class="hokm-sheet-top">
          <div>
            <p>${isSetup ? "میز خصوصی" : "حکم آنلاین"}</p>
            <h2 id="hokm-start-title">${isSetup ? "تنظیمات میز" : "شروع بازی حکم"}</h2>
          </div>
          <button class="icon-button" type="button" data-action="hokm-close-start" aria-label="بستن">${icon("x", 18)}</button>
        </div>
        ${isSetup ? HokmSetupPanel(modal) : HokmStartPanel(modal, player)}
      </div>
    </section>
  `;
}

function HokmStartPanel(modal, player) {
  return `
    <div class="hokm-start-grid">
      <label class="hokm-field">
        <span>اسم شما</span>
        <input
          name="hokm-player-name"
          value="${escapeAttr(modal.playerName || player.playerName || "")}"
          placeholder="بازیکن"
          data-action="hokm-start-field"
          data-field="playerName"
        />
      </label>

      <section class="hokm-start-card">
        <div>
          <p>ورود به میز</p>
          <h3>کد میز</h3>
        </div>
        <input
          name="hokm-join-code"
          value="${escapeAttr(modal.joinCode)}"
          placeholder="مثلاً H4829"
          data-action="hokm-start-field"
          data-field="joinCode"
          inputmode="latin"
        />
        <button class="primary-button" type="button" data-action="hokm-join-room" ${modal.loading ? "disabled" : ""}>
          ${modal.loading ? `<span class="hokm-spinner"></span>` : icon("arrow", 17)}
          ورود به میز
        </button>
      </section>

      <section class="hokm-start-card hokm-create-card">
        <div>
          <p>ساخت میز</p>
          <h3>یک میز خصوصی برای ۴ نفر</h3>
        </div>
        <button class="secondary-button" type="button" data-action="hokm-create-setup" ${modal.loading ? "disabled" : ""}>
          ${modal.loading ? `<span class="hokm-spinner"></span>` : icon("plus", 17)}
          ساخت میز جدید
        </button>
      </section>
    </div>
    ${HokmModalFeedback(modal)}
  `;
}

function HokmSetupPanel(modal) {
  const room = modal.setupRoom;
  const code = room?.code || "----";
  return `
    <div class="hokm-setup-layout">
      <section class="hokm-start-card">
        <div>
          <p>کد میز</p>
          <h3>${escapeHtml(code)}</h3>
        </div>
        <button class="secondary-button" type="button" data-action="hokm-copy-code" data-code="${escapeAttr(code)}" ${room ? "" : "disabled"}>
          ${icon("share", 17)}
          کپی کد
        </button>
      </section>

      <section class="hokm-start-card">
        <div>
          <p>تعداد راند</p>
          <h3>${toPersianDigits(modal.roundsTarget)} دستی</h3>
        </div>
        <div class="hokm-segmented" role="group" aria-label="تعداد راند">
          ${[3, 5, 7]
            .map(
              (rounds) => `
                <button
                  type="button"
                  class="${Number(modal.roundsTarget) === rounds ? "is-selected" : ""}"
                  data-action="hokm-rounds-select"
                  data-value="${rounds}"
                  ${modal.loading || !room ? "disabled" : ""}
                >
                  ${toPersianDigits(rounds)} دستی
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="hokm-preview-card">
        <h3>پیش‌نمایش میز</h3>
        ${PreviewRow("بازی", "حکم چهار نفره")}
        ${PreviewRow("کد میز", code)}
        ${PreviewRow("تعداد راند", `${toPersianDigits(modal.roundsTarget)} دستی`)}
        ${PreviewRow("ظرفیت", "۴ بازیکن")}
        ${PreviewRow("وضعیت", "خصوصی با کد میز")}
        ${room?.expiresAt ? PreviewRow("انقضا", formatHokmTimeLeft(room.expiresAt)) : ""}
      </section>

      <div class="hokm-setup-actions">
        <button class="primary-button" type="button" data-action="hokm-start-online" ${room && !modal.loading ? "" : "disabled"}>
          ${icon("play", 17)}
          شروع بازی آنلاین
        </button>
        <button class="secondary-button" type="button" data-action="hokm-back-to-start">بازگشت</button>
      </div>
    </div>
    ${HokmModalFeedback(modal)}
  `;
}

function PreviewRow(label, value) {
  return `<div class="hokm-preview-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function HokmModalFeedback(modal) {
  return `
    ${modal.error ? `<p class="hokm-error">${escapeHtml(modal.error)}</p>` : ""}
    ${modal.status ? `<p class="hokm-status">${escapeHtml(modal.status)}</p>` : ""}
  `;
}

export function HokmRouteScreen({ hokm, player }) {
  if (hokm.loading) {
    return `
      <section class="hokm-shell">
        <div class="hokm-state-card"><span class="hokm-spinner"></span><p>در حال بارگذاری میز...</p></div>
      </section>
    `;
  }

  if (hokm.error || !hokm.room) {
    return `
      <section class="hokm-shell">
        <div class="hokm-state-card">
          <h1>میز پیدا نشد</h1>
          <p>${escapeHtml(hokm.error || "میزی با این کد پیدا نشد.")}</p>
          <a class="primary-button" href="#/game/hokm-4-nafareh">بازگشت به حکم</a>
        </div>
      </section>
    `;
  }

  const room = hokm.room;
  const view = hokm.view || {};
  const currentSeat = view.currentSeat || null;
  const expired = isHokmRoomExpired(room);
  const content = room.status === "lobby"
    ? HokmLobby({ room, view, currentSeat, hokm })
    : HokmGameTable({ room, view, currentSeat, hokm });

  return `
    <section class="hokm-shell">
      <div class="hokm-bg-glow" aria-hidden="true"></div>
      ${content}
      ${expired ? HokmExpiredOverlay() : ""}
    </section>
  `;
}

function HokmLobby({ room, view, currentSeat, hokm }) {
  const host = Boolean(view?.isHost);
  const ready = room.seats.length === 4;
  const seatPositions = seatPositionsFor(currentSeat);

  return `
    ${HokmTopBar({ room, view, statusLabel: "لابی" })}
    <section class="hokm-lobby">
      <div class="hokm-lobby-table">
        ${[1, 2, 3, 4].map((seat) => SeatBadge({ room, seat, currentSeat, state: room.publicState, seatPositions })).join("")}
        <div class="hokm-table-core">
          <span>کد میز را برای ۳ نفر دیگر بفرستید</span>
          <strong>${escapeHtml(room.code)}</strong>
          <small>یارها روبه‌روی هم می‌نشینند.</small>
        </div>
      </div>

      <aside class="hokm-lobby-panel">
        <h1>حکم چهار نفره</h1>
        <p>کد میز را برای دوستانتان بفرستید. بازی وقتی شروع می‌شود که هر ۴ صندلی پر شده باشد.</p>
        ${TeamPreview(room)}
        ${!currentSeat && isHokmRoomJoinable(room) ? InlineJoinPanel(hokm) : ""}
        ${
          host
            ? `<button class="primary-button hokm-pulse-action" type="button" data-action="hokm-start-hand" ${ready && !hokm.busy ? "" : "disabled"}>
                ${hokm.busy ? `<span class="hokm-spinner"></span>` : icon("play", 17)}
                شروع دست اول
              </button>`
            : `<p class="hokm-status">منتظر میزبان برای شروع بازی...</p>`
        }
        ${hokm.error ? `<p class="hokm-error">${escapeHtml(hokm.error)}</p>` : ""}
      </aside>
    </section>
  `;
}

function InlineJoinPanel(hokm) {
  return `
    <div class="hokm-inline-join">
      <label class="hokm-field">
        <span>اسم شما</span>
        <input name="hokm-route-name" value="${escapeAttr(hokm.routeName)}" placeholder="بازیکن" data-action="hokm-route-field" data-field="routeName" />
      </label>
      <button class="secondary-button" type="button" data-action="hokm-join-current-room" ${hokm.busy ? "disabled" : ""}>ورود به این میز</button>
    </div>
  `;
}

function TeamPreview(room) {
  const seat = (number) => room.seats.find((item) => item.seat === number)?.playerName || "در انتظار بازیکن...";
  return `
    <div class="hokm-team-preview">
      <span>تیم ۱: ${escapeHtml(seat(1))} و ${escapeHtml(seat(3))}</span>
      <span>تیم ۲: ${escapeHtml(seat(2))} و ${escapeHtml(seat(4))}</span>
      <small>یارها روبه‌روی هم می‌نشینند.</small>
    </div>
  `;
}

function HokmGameTable({ room, view, currentSeat, hokm }) {
  const state = room.publicState || {};
  const expired = isHokmRoomExpired(room);
  const phase = state.phase || room.status;
  const myHand = currentSeat ? sortHand(view?.hand || [], state.trumpSuit) : [];
  const legalIds = new Set(view?.legalCardIds || []);
  const seatPositions = seatPositionsFor(currentSeat);
  const deadlineLabel = state.turnDeadlineAt ? formatHokmCountdown(state.turnDeadlineAt) : "";

  return `
    ${HokmTopBar({ room, view, statusLabel: "آنلاین" })}
    <section class="hokm-table-screen ${expired ? "is-expired" : ""}">
      <div class="hokm-score-strip">
        <span>تیم ۱: ${toPersianDigits(state.rounds?.team1 || 0)}</span>
        <span>تیم ۲: ${toPersianDigits(state.rounds?.team2 || 0)}</span>
        <span>دست ${toPersianDigits(state.handNumber || 1)} از ${toPersianDigits(room.roundsTarget)}</span>
        ${state.trumpSuit ? `<strong>حکم: ${getSuitLabel(state.trumpSuit)} ${getSuitSymbol(state.trumpSuit)}</strong>` : ""}
        ${deadlineLabel ? `<strong class="hokm-turn-timer">زمان: ${deadlineLabel}</strong>` : ""}
      </div>

      <div class="hokm-game-table">
        ${[1, 2, 3, 4].map((seat) => SeatBadge({ room, seat, currentSeat, state, seatPositions })).join("")}
        <div class="hokm-trick-zone">
          ${TrickCards(state, seatPositions)}
          ${StatePrompt({ room, state, currentSeat })}
        </div>
      </div>

      ${TrumpSelection({ room, state, currentSeat, busy: hokm.busy })}
      ${RoundResult({ view, state, busy: hokm.busy })}
      ${PlayerHand({ hand: myHand, legalIds, currentSeat, phase, state, pendingCardId: hokm.pendingCardId })}
      ${hokm.error ? `<p class="hokm-error hokm-table-error">${escapeHtml(hokm.error)}</p>` : ""}
    </section>
  `;
}

function HokmTopBar({ room, view, statusLabel }) {
  const canLeave = view?.currentSeat;
  const canCancel = view?.isHost && ["lobby", "trump_selection", "playing", "round_ended"].includes(room.status);
  return `
    <header class="hokm-top">
      <a class="icon-button" href="#/game/hokm-4-nafareh" aria-label="بازگشت">${icon("back", 18)}</a>
      <div class="hokm-top-title">
        <h1>حکم چهار نفره</h1>
        <span>${escapeHtml(statusLabel)}</span>
      </div>
      <div class="hokm-top-actions">
        <button class="hokm-code-pill" type="button" data-action="hokm-copy-code" data-code="${escapeAttr(room.code)}">کد میز: ${escapeHtml(room.code)}</button>
        <span class="hokm-expiry">انقضا: ${formatHokmTimeLeft(room.expiresAt)}</span>
        ${canCancel ? `<button class="icon-button" type="button" data-action="hokm-cancel-room" aria-label="لغو میز">${icon("x", 17)}</button>` : ""}
        ${canLeave ? `<button class="icon-button" type="button" data-action="hokm-leave-room" aria-label="خروج از میز">${icon("logout", 17)}</button>` : ""}
      </div>
    </header>
  `;
}

function SeatBadge({ room, seat, currentSeat, state = {}, seatPositions }) {
  const player = room.seats.find((item) => item.seat === seat);
  const isCurrent = Number(currentSeat) === Number(seat);
  const isTurn = Number(state.currentTurnSeat || state.turnSeat) === Number(seat);
  const isHakim = Number(state.hakimSeat) === Number(seat);
  const team = getTeamForSeat(seat) === "team1" ? "تیم ۱" : "تیم ۲";
  const handCount = state.handCounts?.[String(seat)] || state.handCounts?.[seat] || 0;
  const position = seatPositions?.[seat] || SEAT_POSITIONS[seat];

  return `
    <div class="hokm-seat hokm-seat-${position} ${isTurn ? "is-turn" : ""} ${isCurrent ? "is-you" : ""} ${!player ? "is-empty" : ""} ${player?.connected === false ? "is-disconnected" : ""}">
      <div class="hokm-seat-avatar">${player ? escapeHtml(player.playerName.slice(0, 1)) : toPersianDigits(seat)}</div>
      <div>
        <strong>${escapeHtml(player?.playerName || "در انتظار بازیکن...")}</strong>
        <span>صندلی ${toPersianDigits(seat)} · ${team}${isCurrent ? " · شما" : ""}</span>
      </div>
      <div class="hokm-seat-tags">
        ${isHakim ? `<em>حاکم</em>` : ""}
        ${handCount ? `<small>${toPersianDigits(handCount)} کارت</small>` : ""}
        ${player && player.connected === false ? `<small>قطع ارتباط</small>` : ""}
      </div>
    </div>
  `;
}

function TrickCards(state, seatPositions) {
  const trick = state.currentTrick?.length ? state.currentTrick : state.lastTrick || [];
  if (!trick.length) return `<div class="hokm-empty-trick">منتظر اولین کارت...</div>`;
  return trick
    .map(
      (play) => `
        <div class="hokm-trick-card hokm-trick-${seatPositions?.[play.seat] || SEAT_POSITIONS[play.seat]} ${Number(state.lastTrickWinnerSeat) === Number(play.seat) ? "is-winner" : ""}">
          ${CardFace(play.card)}
        </div>
      `
    )
    .join("");
}

function StatePrompt({ state, currentSeat }) {
  if (state.phase === "trump_selection") {
    return `<p class="hokm-table-prompt">${Number(state.hakimSeat) === Number(currentSeat) ? "حکم را انتخاب کنید" : "حاکم در حال انتخاب حکم است..."}</p>`;
  }
  if (state.phase === "playing") {
    return `<p class="hokm-table-prompt">${Number(state.currentTurnSeat || state.turnSeat) === Number(currentSeat) ? "نوبت شماست" : "منتظر بازیکن دیگر..."}</p>`;
  }
  return "";
}

function TrumpSelection({ state, currentSeat, busy }) {
  if (state.phase !== "trump_selection") return "";
  if (Number(state.hakimSeat) !== Number(currentSeat)) {
    return `<section class="hokm-trump-panel"><p>حاکم در حال انتخاب حکم است...</p></section>`;
  }

  return `
    <section class="hokm-trump-panel">
      <h2>حکم را انتخاب کنید</h2>
      <div class="hokm-suit-grid">
        ${HOKM_SUITS.map(
          (suit) => `
            <button type="button" data-action="hokm-select-trump" data-suit="${escapeAttr(suit)}" ${busy ? "disabled" : ""}>
              <span>${getSuitSymbol(suit)}</span>
              ${getSuitLabel(suit)}
            </button>
          `
        ).join("")}
      </div>
    </section>
  `;
}

function RoundResult({ view, state, busy }) {
  if (!["round_ended", "match_finished"].includes(state.phase)) return "";
  const host = Boolean(view?.isHost);
  const winner = state.roundWinnerTeam === "team1" ? "تیم ۱" : "تیم ۲";

  return `
    <section class="hokm-result-panel">
      <h2>${state.phase === "match_finished" ? "بازی تمام شد" : "پایان دست"}</h2>
      <p>${winner} این دست را برد.</p>
      ${
        state.phase === "round_ended" && host
          ? `<button class="primary-button" type="button" data-action="hokm-next-round" ${busy ? "disabled" : ""}>شروع دست بعدی</button>`
          : ""
      }
      ${state.phase === "match_finished" ? `<a class="secondary-button" href="#/game/hokm-4-nafareh">ساخت میز جدید</a>` : ""}
    </section>
  `;
}

function PlayerHand({ hand, legalIds, currentSeat, phase, state, pendingCardId }) {
  if (!currentSeat) return "";
  const isMyTurn = phase === "playing" && Number(state.currentTurnSeat || state.turnSeat) === Number(currentSeat);
  const count = Math.max(1, hand.length);

  return `
    <section class="hokm-hand-zone" aria-label="کارت‌های شما">
      <div class="hokm-hand-helper">${isMyTurn ? "نوبت شماست" : phase === "playing" ? "منتظر بازیکن دیگر..." : "کارت‌های شما"}</div>
      <div class="hokm-hand" style="--card-count:${count}">
        ${hand
          .map((card, index) => {
            const legal = !isMyTurn || legalIds.has(card.id);
            const action = isMyTurn && legal ? "hokm-play-card" : isMyTurn ? "hokm-illegal-card" : "";
            const mid = (count - 1) / 2;
            const rotate = (index - mid) * 4;
            const lift = Math.abs(index - mid) * 3;
            return `
              <button
                class="hokm-card-button ${legal ? "is-legal" : "is-illegal"} ${pendingCardId === card.id ? "is-pending" : ""}"
                type="button"
                style="--card-rotate:${rotate}deg; --card-hover-rotate:${rotate * 0.75}deg; --card-lift:${lift}px"
                ${action ? `data-action="${action}"` : "disabled"}
                data-card-id="${escapeAttr(card.id)}"
                aria-label="${escapeAttr(cardAriaLabel(card))}"
              >
                ${CardFace(card)}
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function CardFace(card) {
  const red = card.color === "red" ? "is-red" : "";
  return `
    <span class="hokm-card ${red}">
      <span class="hokm-card-corner">${escapeHtml(card.rank)}<small>${escapeHtml(card.symbol)}</small></span>
      <strong>${escapeHtml(card.symbol)}</strong>
      <small>${escapeHtml(card.faSuit)}</small>
    </span>
  `;
}

function cardAriaLabel(card) {
  const ranks = { A: "آس", K: "شاه", Q: "بی‌بی", J: "سرباز" };
  return `${ranks[card.rank] || card.rank} ${card.faSuit}`;
}

function HokmExpiredOverlay() {
  return `
    <div class="hokm-expired-overlay">
      <div class="hokm-result-panel">
        <h2>زمان این میز تمام شد.</h2>
        <p>برای ادامه، یک میز جدید بسازید.</p>
        <a class="primary-button" href="#/game/hokm-4-nafareh">ساخت میز جدید</a>
      </div>
    </div>
  `;
}
