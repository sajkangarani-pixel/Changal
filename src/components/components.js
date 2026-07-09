import {
  FILTER_GROUPS,
  QUICK_FILTERS,
  REQUIREMENT_CATEGORIES,
  SORT_OPTIONS,
  PLAYER_RANGES,
  DURATION_RANGES,
  ACTIVITY_LEVELS,
  ENVIRONMENTS
} from "../data/constants.js?v=20260709-admin4";
import {
  countAdvancedFilters,
  formatDuration,
  formatEquipment,
  formatPlayers,
  getGameTypeLabel,
  getRequirementLabel,
  summarizeFilters
} from "../services/filtering.js?v=20260709-admin4";
import { renderArtwork } from "./artwork.js?v=20260709-admin4";
import { icon } from "./icons.js?v=20260709-admin4";

export const navItems = [
  { id: "discover", label: "Discover", icon: "discover", href: "#/" },
  { id: "explore", label: "Explore", icon: "explore", href: "#/explore" },
  { id: "saved", label: "Saved", icon: "saved", href: "#/saved" },
  { id: "profile", label: "Profile", icon: "profile", href: "#/profile" }
];

export function AppShell({ activeNav = "discover", content = "", modals = "", showNav = true }) {
  return `
    <div class="ambient-background" aria-hidden="true"></div>
    <main class="app-shell" id="main-content">
      ${content}
    </main>
    ${showNav ? FloatingBottomNavigation(activeNav) : ""}
    <div class="toast-region" id="toast-region" aria-live="polite"></div>
    ${modals}
  `;
}

export function TopAppBar({
  title,
  subtitle = "",
  actions = "default",
  backHref = "",
  compact = false
}) {
  const leading = backHref
    ? `<a class="icon-button" href="${backHref}" aria-label="Go back">${icon("back")}</a>`
    : `<div class="top-copy">
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      </div>`;

  return `
    <header class="top-app-bar ${compact ? "top-app-bar-compact" : ""}" data-top-app-bar>
      <div class="top-leading">
        ${leading}
        ${
          backHref
            ? `<div class="top-copy">
                <h1>${escapeHtml(title)}</h1>
                ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
              </div>`
            : ""
        }
      </div>
      <div class="top-actions">
        ${
          actions === "detail"
            ? `
              <button class="icon-button" type="button" data-action="share-current" aria-label="Share game">${icon("share")}</button>
              <button class="avatar-button" type="button" data-action="go-profile" aria-label="Open profile"><span>AM</span></button>
            `
            : `
              <button class="icon-button" type="button" data-action="notify" aria-label="Open notifications">${icon("bell")}</button>
              <button class="avatar-button" type="button" data-action="go-profile" aria-label="Open profile"><span>AM</span></button>
            `
        }
      </div>
    </header>
  `;
}

export function SearchField({ scope, value = "", placeholder, label = "Search", showFilter = true }) {
  return `
    <label class="search-field" data-search-scope="${scope}">
      <span class="sr-only">${escapeHtml(label)}</span>
      ${icon("search", 20, "search-field-icon")}
      <input
        type="search"
        name="${scope}-search"
        value="${escapeAttr(value)}"
        placeholder="${escapeAttr(placeholder)}"
        autocomplete="off"
        data-action="search"
        data-scope="${scope}"
      />
      ${
        showFilter
          ? `<button class="search-filter-button" type="button" data-action="open-filter" data-scope="${scope}" aria-label="Open filters">
              ${icon("sliders", 18)}
            </button>`
          : ""
      }
    </label>
  `;
}

export function RequirementCategoryList({ selected, scope }) {
  return `
    <div class="horizontal-rail category-rail" role="list" aria-label="Requirement categories">
      ${REQUIREMENT_CATEGORIES.map((category) => RequirementCategoryChip({ category, selected, scope })).join("")}
    </div>
  `;
}

export function RequirementCategoryChip({ category, selected, scope }) {
  const isSelected = selected === category.id;
  return `
    <button
      class="chip category-chip ${isSelected ? "is-selected" : ""}"
      type="button"
      role="listitem"
      aria-pressed="${isSelected}"
      data-action="select-requirement"
      data-scope="${scope}"
      data-value="${category.id}"
    >
      <span class="chip-icon">${icon(category.icon, 17)}</span>
      <span>${escapeHtml(category.label)}</span>
    </button>
  `;
}

export function QuickFilterList({ selected = [] }) {
  return `
    <div class="horizontal-rail quick-filter-rail" role="list" aria-label="Quick filters">
      ${QUICK_FILTERS.map((filter) => FilterChip({
        label: filter.label,
        value: filter.id,
        selected: selected.includes(filter.id),
        action: "toggle-quick-filter"
      })).join("")}
    </div>
  `;
}

export function FilterChip({ label, value, selected, action, extra = "" }) {
  return `
    <button
      class="chip filter-chip ${selected ? "is-selected" : ""}"
      type="button"
      role="listitem"
      aria-pressed="${selected}"
      data-action="${action}"
      data-value="${escapeAttr(value)}"
      ${extra}
    >
      ${selected ? icon("check", 15) : ""}
      <span>${escapeHtml(label)}</span>
    </button>
  `;
}

export function SectionHeader({ title, eyebrow = "", action = "" }) {
  return `
    <div class="section-header">
      <div>
        ${eyebrow ? `<p>${escapeHtml(eyebrow)}</p>` : ""}
        <h2>${escapeHtml(title)}</h2>
      </div>
      ${action}
    </div>
  `;
}

export function ActiveFilterSummary(filters = {}) {
  const chips = summarizeFilters(filters);
  if (!chips.length) return "";

  return `
    <div class="active-filter-summary" aria-label="Active filters">
      ${chips
        .map(
          (chip) => `
          <button
            class="summary-chip"
            type="button"
            data-action="remove-advanced-filter"
            data-key="${escapeAttr(chip.key)}"
            data-value="${escapeAttr(chip.id)}"
          >
            <span>${escapeHtml(chip.label)}</span>
            ${icon("x", 13)}
          </button>
        `
        )
        .join("")}
    </div>
  `;
}

export function FeaturedGameCarousel({ games, savedIds }) {
  if (!games.length) {
    return EmptyState({
      title: "No featured matches",
      message: "Try clearing a filter or choosing another requirement category.",
      action: `<button class="text-button" type="button" data-action="reset-filters">Reset Filters</button>`
    });
  }

  return `
    <div class="featured-carousel" aria-label="Featured games">
      ${games.map((game) => FeaturedGameCard({ game, saved: savedIds.has(game.id) })).join("")}
    </div>
  `;
}

export function FeaturedGameCard({ game, saved }) {
  const detailHref = gameDetailHref(game);

  return `
    <article class="featured-card">
      <a class="featured-card-link" href="${detailHref}" aria-label="Open ${escapeAttr(game.title)} details"></a>
      ${renderArtwork(game, "featured-art")}
      <div class="featured-gradient" aria-hidden="true"></div>
      <div class="featured-top-row">
        <span class="badge badge-primary">${escapeHtml(getRequirementLabel(game.requirementCategory))}</span>
        ${SaveButton({ gameId: game.id, saved, compact: true })}
      </div>
      <div class="featured-copy">
        <p>${escapeHtml(game.trending ? "Trending now" : game.shortDescription)}</p>
        <h3>${escapeHtml(game.title)}</h3>
        <div class="featured-meta" aria-label="${escapeAttr(`${formatPlayers(game)}, ${formatDuration(game)}`)}">
          <span>${icon("users", 15)} ${escapeHtml(formatPlayers(game))}</span>
          <span>${icon("clock", 15)} ${escapeHtml(formatDuration(game))}</span>
        </div>
      </div>
      <a class="round-cta" href="${detailHref}" aria-label="View ${escapeAttr(game.title)}">${icon("arrow", 21)}</a>
    </article>
  `;
}

export function GameGrid({ games, savedIds, emptyTitle = "No games match these filters.", emptyAction = "" }) {
  if (!games.length) {
    return EmptyState({
      title: emptyTitle,
      message: "Adjust search, requirement or filters to discover more options.",
      action: emptyAction
    });
  }

  return `
    <div class="game-grid">
      ${games.map((game) => GameCard({ game, saved: savedIds.has(game.id) })).join("")}
    </div>
  `;
}

export function GameCard({ game, saved }) {
  const primaryType = getGameTypeLabel(game.gameTypes[0]);
  const tags = (game.displayTags || game.tags).slice(0, 2).join(" · ");
  const detailHref = gameDetailHref(game);

  return `
    <article class="game-card ${game.trending ? "is-trending" : ""}">
      <a class="game-card-link" href="${detailHref}" aria-label="Open ${escapeAttr(game.title)} details"></a>
      <div class="game-card-art-wrap">
        ${renderArtwork(game, "game-card-art")}
        ${game.trending ? `<span class="badge badge-dark">Editor's pick</span>` : ""}
        ${SaveButton({ gameId: game.id, saved, compact: true })}
      </div>
      <div class="game-card-body">
        <p class="game-type">${escapeHtml(primaryType)}</p>
        <h3>${escapeHtml(game.title)}</h3>
        ${GameMetadata(game)}
        <p class="game-tags">${escapeHtml(tags)}</p>
      </div>
    </article>
  `;
}

export function GameMetadata(game, compact = false) {
  return `
    <div class="metadata-row ${compact ? "metadata-row-compact" : ""}">
      <span aria-label="${escapeAttr(formatPlayers(game))}">${icon("users", 14)} ${escapeHtml(formatPlayers(game))}</span>
      <span aria-label="${escapeAttr(formatDuration(game))}">${icon("clock", 14)} ${escapeHtml(formatDuration(game))}</span>
      ${
        compact
          ? ""
          : `<span aria-label="${escapeAttr(formatEquipment(game))}">${icon(game.requirementCategory === "online" ? "globe" : "dice", 14)} ${escapeHtml(formatEquipment(game))}</span>`
      }
    </div>
  `;
}

export function SaveButton({ gameId, saved, compact = false }) {
  return `
    <button
      class="save-button ${compact ? "save-button-compact" : ""} ${saved ? "is-saved" : ""}"
      type="button"
      data-action="toggle-save"
      data-game-id="${escapeAttr(gameId)}"
      aria-pressed="${saved}"
      aria-label="${saved ? "Remove from saved games" : "Save game"}"
    >
      ${icon(saved ? "heart" : "saved", compact ? 18 : 20)}
    </button>
  `;
}

export function FloatingBottomNavigation(activeNav) {
  return `
    <nav class="floating-nav" aria-label="Primary">
      ${navItems
        .map((item) => {
          const active = item.id === activeNav;
          return `
            <a
              class="nav-item ${active ? "is-active" : ""}"
              href="${item.href}"
              aria-current="${active ? "page" : "false"}"
              aria-label="${escapeAttr(item.label)}"
            >
              ${icon(item.icon, 19)}
              <span>${escapeHtml(item.label)}</span>
            </a>
          `;
        })
        .join("")}
    </nav>
  `;
}

export function FilterSheet({ open, scope, draftFilters, applyCount }) {
  if (!open) return "";

  return `
    <div class="sheet-backdrop" data-action="close-filter" aria-hidden="true"></div>
    <section class="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-header">
        <div>
          <p>Refine games</p>
          <h2 id="filter-title">Filters</h2>
        </div>
        <button class="icon-button" type="button" data-action="close-filter" aria-label="Close filters">${icon("x")}</button>
      </div>
      <div class="filter-groups">
        ${FILTER_GROUPS.map((group) => FilterGroup({ group, draftFilters })).join("")}
      </div>
      <div class="sheet-actions">
        <button class="secondary-button" type="button" data-action="reset-filters">${icon("reset", 17)} Reset</button>
        <button class="primary-button" type="button" data-action="apply-filters" data-scope="${escapeAttr(scope)}">
          Show ${applyCount} Game${applyCount === 1 ? "" : "s"}
        </button>
      </div>
    </section>
  `;
}

function FilterGroup({ group, draftFilters }) {
  return `
    <section class="filter-group">
      <h3>${escapeHtml(group.title)}</h3>
      <div class="filter-options" role="list">
        ${group.options
          .map((option) =>
            FilterChip({
              label: option.label,
              value: option.id,
              selected: draftFilters[group.key]?.includes(option.id),
              action: "toggle-advanced-filter",
              extra: `data-key="${escapeAttr(group.key)}"`
            })
          )
          .join("")}
      </div>
    </section>
  `;
}

export function SortControl({ value }) {
  return `
    <label class="sort-control">
      <span class="sr-only">Sort games</span>
      <select data-action="change-sort" aria-label="Sort games">
        ${SORT_OPTIONS.map(
          (option) => `<option value="${option.id}" ${value === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`
        ).join("")}
      </select>
    </label>
  `;
}

export function EmptyState({ title, message = "", action = "" }) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon("sparkles", 24)}</div>
      <h3>${escapeHtml(title)}</h3>
      ${message ? `<p>${escapeHtml(message)}</p>` : ""}
      ${action}
    </div>
  `;
}

export function LoadingSkeleton({ count = 4 }) {
  return `
    <div class="game-grid" aria-hidden="true">
      ${Array.from({ length: count })
        .map(
          () => `
        <div class="skeleton-card">
          <span></span>
          <strong></strong>
          <em></em>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

export function RandomGameSetup({ open, constraints, matchCount }) {
  if (!open) return "";

  return `
    <div class="sheet-backdrop" data-action="close-random" aria-hidden="true"></div>
    <section class="random-sheet" role="dialog" aria-modal="true" aria-labelledby="random-title">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-header">
        <div>
          <p>Surprise Me</p>
          <h2 id="random-title">Pick a game</h2>
        </div>
        <button class="icon-button" type="button" data-action="close-random" aria-label="Close random picker">${icon("x")}</button>
      </div>
      <div class="random-form">
        ${SelectField({
          label: "Players",
          name: "playerCount",
          value: constraints.playerCount,
          options: PLAYER_RANGES,
          empty: "Any group"
        })}
        ${SelectField({
          label: "Available Time",
          name: "duration",
          value: constraints.duration,
          options: DURATION_RANGES,
          empty: "Any duration"
        })}
        ${SelectField({
          label: "Equipment",
          name: "requirement",
          value: constraints.requirement,
          options: REQUIREMENT_CATEGORIES,
          empty: "Any equipment"
        })}
        ${SelectField({
          label: "Environment",
          name: "environment",
          value: constraints.environment,
          options: ENVIRONMENTS,
          empty: "Anywhere"
        })}
        ${SelectField({
          label: "Activity",
          name: "activityLevel",
          value: constraints.activityLevel,
          options: ACTIVITY_LEVELS,
          empty: "Any activity"
        })}
      </div>
      <button class="primary-button primary-button-full" type="button" data-action="pick-random">
        ${icon("dice", 18)} Pick from ${matchCount} Game${matchCount === 1 ? "" : "s"}
      </button>
    </section>
  `;
}

export function RandomGameResult({ result, savedIds }) {
  if (!result?.game) return "";
  const { game, reasons, fromFallback } = result;

  return `
    <div class="sheet-backdrop" data-action="close-random-result" aria-hidden="true"></div>
    <section class="random-result" role="dialog" aria-modal="true" aria-labelledby="random-result-title">
      <div class="random-result-art">
        ${renderArtwork(game, "result-art")}
        ${SaveButton({ gameId: game.id, saved: savedIds.has(game.id), compact: true })}
      </div>
      <div class="random-result-body">
        <p>${fromFallback ? "Closest match" : "Selected for now"}</p>
        <h2 id="random-result-title">${escapeHtml(game.title)}</h2>
        <span>${escapeHtml(game.shortDescription)}</span>
        <div class="reason-list">
          ${reasons.map((reason) => `<span>${icon("check", 14)} ${escapeHtml(reason)}</span>`).join("")}
        </div>
        ${GameMetadata(game)}
        <div class="random-actions">
          <a class="primary-button" href="${gameDetailHref(game)}" data-action="close-random-result">${icon("play", 18)} Start Game</a>
          <button class="secondary-button" type="button" data-action="pick-random">${icon("reset", 17)} Pick Another</button>
        </div>
      </div>
    </section>
  `;
}

export function StartGameSheet({ game, onlineAvailable }) {
  if (!game) return "";

  const isOnline = game.requirementCategory === "online";
  const unavailable = isOnline && !onlineAvailable;
  const firstStep = game.setupInstructions?.[0] || "Gather your players.";

  return `
    <div class="sheet-backdrop" data-action="close-starter" aria-hidden="true"></div>
    <section class="starter-sheet" role="dialog" aria-modal="true" aria-labelledby="starter-title">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-header">
        <div>
          <p>Game starter</p>
          <h2 id="starter-title">${escapeHtml(game.title)}</h2>
        </div>
        <button class="icon-button" type="button" data-action="close-starter" aria-label="Close starter">${icon("x")}</button>
      </div>
      <div class="starter-panel ${unavailable ? "is-disabled" : ""}">
        <div class="starter-icon">${icon(unavailable ? "offline" : isOnline ? "globe" : "play", 24)}</div>
        <div>
          <h3>${unavailable ? "Online play is unavailable" : isOnline ? "Open the online room" : "Ready to start"}</h3>
          <p>${escapeHtml(unavailable ? "Reconnect to the internet before launching this game." : firstStep)}</p>
        </div>
      </div>
      <div class="starter-tools">
        <button class="tool-button" type="button" data-action="mock-timer">${icon("clock", 17)} 60s Timer</button>
        <button class="tool-button" type="button" data-action="mock-first-player">${icon("users", 17)} First Player</button>
        <button class="tool-button" type="button" data-action="mock-prompt">${icon("sparkles", 17)} Prompt</button>
      </div>
      ${
        isOnline
          ? `<a class="primary-button primary-button-full ${unavailable ? "is-disabled" : ""}" href="${escapeAttr(game.onlineUrl || "#")}" target="_blank" rel="noreferrer" aria-disabled="${unavailable}">
              ${icon("globe", 18)} Open Online Game
            </a>`
          : `<button class="primary-button primary-button-full" type="button" data-action="starter-ready">
              ${icon("play", 18)} Begin Round
            </button>`
      }
    </section>
  `;
}

export function DetailHero({ game, saved, onlineAvailable }) {
  const disabled = game.requirementCategory === "online" && !onlineAvailable;

  return `
    <section class="detail-hero">
      ${renderArtwork(game, "detail-hero-art")}
      <div class="detail-hero-gradient" aria-hidden="true"></div>
      <div class="detail-actions">
        <a class="icon-button" href="#/" aria-label="Go back">${icon("back")}</a>
        <div>
          ${SaveButton({ gameId: game.id, saved })}
          <button class="icon-button" type="button" data-action="share-current" aria-label="Share game">${icon("share")}</button>
        </div>
      </div>
      <div class="detail-hero-copy">
        <span class="badge badge-primary">${escapeHtml(getRequirementLabel(game.requirementCategory))}</span>
        <h1>${escapeHtml(game.title)}</h1>
        <p>${escapeHtml(game.shortDescription)}</p>
        ${disabled ? `<span class="offline-badge">${icon("offline", 15)} Online play unavailable while offline</span>` : ""}
      </div>
    </section>
  `;
}

export function QuickInfoRow(game) {
  const info = [
    { iconName: "users", label: "Players", value: formatPlayers(game) },
    { iconName: "clock", label: "Duration", value: formatDuration(game) },
    { iconName: "sparkles", label: "Age", value: game.ageGroups.includes("all-ages") ? "All Ages" : "Family+" },
    { iconName: "activity", label: "Activity", value: titleCase(game.activityLevel) },
    { iconName: game.requirementCategory === "online" ? "globe" : "dice", label: "Place", value: placeLabel(game) }
  ];

  return `
    <div class="quick-info-row">
      ${info
        .map(
          (item) => `
          <div class="quick-info-item">
            ${icon(item.iconName, 17)}
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

export function InstructionList({ title, items, ordered = false }) {
  const tag = ordered ? "ol" : "ul";
  return `
    <section class="detail-section">
      <h2>${escapeHtml(title)}</h2>
      <${tag} class="instruction-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </${tag}>
    </section>
  `;
}

export function VariationCards(variations = []) {
  if (!variations.length) return "";
  return `
    <section class="detail-section">
      <h2>Variations</h2>
      <div class="variation-grid">
        ${variations
          .map(
            (variation) => `
          <article class="variation-card">
            <h3>${escapeHtml(variation.title)}</h3>
            <p>${escapeHtml(variation.description)}</p>
          </article>
        `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function StickyPrimaryAction({ game, onlineAvailable }) {
  const disabled = game.requirementCategory === "online" && !onlineAvailable;
  return `
    <div class="sticky-action">
      <button
        class="primary-button primary-button-full"
        type="button"
        data-action="start-game"
        data-game-id="${escapeAttr(game.id)}"
        ${disabled ? "disabled" : ""}
      >
        ${icon(disabled ? "offline" : "play", 18)}
        ${disabled ? "Unavailable Offline" : "Start Game"}
      </button>
    </div>
  `;
}

function SelectField({ label, name, value, options, empty }) {
  return `
    <label class="select-field">
      <span>${escapeHtml(label)}</span>
      <select data-action="random-constraint" data-name="${escapeAttr(name)}">
        <option value="">${escapeHtml(empty)}</option>
        ${options
          .filter((option) => option.id !== "all" || name === "requirement")
          .map(
            (option) => `<option value="${option.id}" ${value === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`
          )
          .join("")}
      </select>
    </label>
  `;
}

function placeLabel(game) {
  if (game.environments.includes("remote-online")) return "Online";
  if (game.environments.includes("outdoor")) return "Outdoor";
  if (game.environments.includes("either")) return "Either";
  return "Indoor";
}

function titleCase(value) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export function buildFilterApplyCount(games, filterGames, criteria, draftFilters) {
  return filterGames(games, {
    ...criteria,
    advancedFilters: draftFilters
  }).length;
}

export function advancedFilterCountLabel(filters) {
  const count = countAdvancedFilters(filters);
  return count ? `${count} active` : "Filters";
}

export function gameDetailHref(game) {
  const routeKey = String(game.slug || game.id || "").trim();
  return `#/game/${encodeURIComponent(routeKey)}`;
}
