import {
  ACTIVITY_LEVELS,
  AGE_GROUPS,
  DEFAULT_ADVANCED_FILTERS,
  ENVIRONMENTS,
  GAME_TYPES,
  PLAYER_RANGES,
  PLAY_STYLES
} from "../data/constants.js?v=20260709-admin5";
import { LANGUAGES, getLanguage } from "../services/i18n.js?v=20260709-admin5";
import {
  ActiveFilterSummary,
  DetailHero,
  EmptyState,
  FeaturedGameCarousel,
  GameGrid,
  GameMetadata,
  InstructionList,
  QuickFilterList,
  QuickInfoRow,
  RequirementCategoryList,
  SearchField,
  SectionHeader,
  SortControl,
  TopAppBar,
  VariationCards,
  advancedFilterCountLabel,
  escapeAttr,
  escapeHtml
} from "./components.js?v=20260709-admin5";
import { icon } from "./icons.js?v=20260709-admin5";
import {
  filterGames,
  formatEquipment,
  getDifficultyLabel,
  getFeaturedGames,
  getGameTypeLabel,
  getPlayStyleLabel,
  getRelatedGames,
  getRequirementLabel,
  sortGames
} from "../services/filtering.js?v=20260709-admin5";

export function DiscoverScreen({ state, games, savedIds, preferences }) {
  const criteria = {
    search: state.discover.search,
    requirement: state.discover.requirement,
    quickFilters: state.discover.quickFilters,
    advancedFilters: state.advancedFilters
  };
  const featured = getFeaturedGames(games, criteria, preferences).slice(0, 8);
  const recommended = sortGames(filterGames(games, criteria), "recommended", preferences);
  const limitedRecommended = recommended.slice(0, 18);

  return `
    ${TopAppBar({
      title: "What should we play?",
      subtitle: "Find the right game for your group."
    })}
    <section class="screen-section screen-section-search">
      ${SearchField({
        scope: "discover",
        value: state.discover.search,
        placeholder: "Search games, equipment or categories..."
      })}
    </section>
    <section class="screen-section">
      ${RequirementCategoryList({ selected: state.discover.requirement, scope: "discover" })}
    </section>
    <section class="screen-section">
      ${SectionHeader({
        title: "Featured Games",
        eyebrow: "Made for right now",
        action: `<button class="pill-action" type="button" data-action="open-random">${icon("dice", 16)} Surprise Me</button>`
      })}
      ${FeaturedGameCarousel({ games: featured, savedIds })}
    </section>
    <section class="screen-section">
      ${SectionHeader({
        title: "Quick Filters",
        action: `<button class="text-button" type="button" data-action="open-filter" data-scope="discover">${escapeHtml(advancedFilterCountLabel(state.advancedFilters))}</button>`
      })}
      ${QuickFilterList({ selected: state.discover.quickFilters })}
      ${ActiveFilterSummary(state.advancedFilters)}
    </section>
    <section class="screen-section">
      ${SectionHeader({
        title: "Recommended Games",
        eyebrow: `${recommended.length} matches`,
        action: recommended.length ? `<a class="text-button" href="#/explore">View all</a>` : ""
      })}
      ${GameGrid({
        games: limitedRecommended,
        savedIds,
        emptyTitle: "No games match these filters.",
        emptyAction: `<button class="text-button" type="button" data-action="reset-filters">Reset Filters</button>`
      })}
    </section>
  `;
}

export function ExploreScreen({ state, games, savedIds, preferences }) {
  const criteria = {
    search: state.explore.search,
    requirement: state.explore.requirement,
    quickFilters: [],
    advancedFilters: state.advancedFilters
  };
  const results = sortGames(filterGames(games, criteria), state.explore.sort, preferences);

  return `
    ${TopAppBar({
      title: "Explore",
      subtitle: "Browse the full game library."
    })}
    <section class="screen-section screen-section-search">
      ${SearchField({
        scope: "explore",
        value: state.explore.search,
        placeholder: "Search all games..."
      })}
    </section>
    <section class="screen-section">
      ${RequirementCategoryList({ selected: state.explore.requirement, scope: "explore" })}
      ${ActiveFilterSummary(state.advancedFilters)}
    </section>
    <section class="screen-section">
      <div class="results-toolbar">
        <div>
          <p>${results.length} result${results.length === 1 ? "" : "s"}</p>
          <h2>All Games</h2>
        </div>
        ${SortControl({ value: state.explore.sort })}
      </div>
      ${GameGrid({
        games: results,
        savedIds,
        emptyTitle: "No games match these filters.",
        emptyAction: `<button class="secondary-button" type="button" data-action="reset-filters">Reset Filters</button>`
      })}
    </section>
  `;
}

export function SavedScreen({ state, games, savedIds }) {
  const savedGames = games.filter((game) => savedIds.has(game.id));
  const results = filterGames(savedGames, {
    search: state.saved.search,
    requirement: state.saved.requirement,
    quickFilters: [],
    advancedFilters: DEFAULT_ADVANCED_FILTERS
  });

  return `
    ${TopAppBar({
      title: "Saved",
      subtitle: `${savedGames.length} saved game${savedGames.length === 1 ? "" : "s"} ready for later.`
    })}
    ${
      savedGames.length
        ? `
          <section class="screen-section screen-section-search">
            ${SearchField({
              scope: "saved",
              value: state.saved.search,
              placeholder: "Search saved games...",
              showFilter: false
            })}
          </section>
          <section class="screen-section">
            ${RequirementCategoryList({ selected: state.saved.requirement, scope: "saved" })}
          </section>
          <section class="screen-section">
            ${SectionHeader({ title: "Saved Games", eyebrow: `${results.length} visible` })}
            ${GameGrid({
              games: results,
              savedIds,
              emptyTitle: "No saved games match this view.",
              emptyAction: `<button class="text-button" type="button" data-action="clear-saved-search">Clear Search</button>`
            })}
          </section>
        `
        : `
          <section class="screen-section">
            ${EmptyState({
              title: "Save games you want to play later.",
              message: "Tap the bookmark on any game to build your short list.",
              action: `<a class="primary-button" href="#/">Discover Games</a>`
            })}
          </section>
        `
    }
  `;
}

export function ProfileScreen({ preferences, savedIds }) {
  return `
    ${TopAppBar({
      title: "Profile",
      subtitle: "Tune recommendations for your favorite way to play."
    })}
    <section class="profile-hero screen-section">
      <div class="profile-avatar" aria-hidden="true">AM</div>
      <label class="profile-name">
        <span>Name</span>
        <input type="text" value="${escapeAttr(preferences.name)}" data-action="preference-name" aria-label="Profile name" />
      </label>
      <div class="profile-stat-row">
        <span><strong>${savedIds.size}</strong> Saved</span>
        <span><strong>${preferences.styles.length}</strong> Styles</span>
      </div>
    </section>
    ${PreferenceSection({
      title: "Preferred Group Size",
      key: "groupSize",
      type: "single",
      selected: preferences.groupSize,
      options: PLAYER_RANGES
    })}
    ${PreferenceSection({
      title: "Preferred Game Styles",
      key: "styles",
      type: "multiple",
      selected: preferences.styles,
      options: GAME_TYPES.filter((item) => ["brain", "physical", "social", "strategy", "creative", "trivia"].includes(item.id))
    })}
    ${PreferenceSection({
      title: "Activity Level",
      key: "activityLevel",
      type: "single",
      selected: preferences.activityLevel,
      options: ACTIVITY_LEVELS
    })}
    ${PreferenceSection({
      title: "Environment",
      key: "environment",
      type: "single",
      selected: preferences.environment,
      options: ENVIRONMENTS
    })}
    <section class="settings-panel screen-section">
      <h2>Settings</h2>
      <label class="language-row">
        <span>
          <strong>Language</strong>
          <small>Choose app language</small>
        </span>
        <select data-action="language-change" aria-label="Language">
          ${LANGUAGES.map(
            (language) =>
              `<option value="${language.id}" ${getLanguage(preferences) === language.id ? "selected" : ""}>${escapeHtml(language.label)}</option>`
          ).join("")}
        </select>
      </label>
      <label class="toggle-row">
        <span>
          <strong>Play reminders</strong>
          <small>Notification settings placeholder</small>
        </span>
        <input type="checkbox" ${preferences.notifications ? "checked" : ""} data-action="preference-toggle" data-key="notifications" />
      </label>
      <div class="app-info">
        <span>Changal</span>
        <strong>Game discovery prototype</strong>
        <small>Local preferences and saved games are stored on this device.</small>
      </div>
    </section>
  `;
}

export function DetailScreen({ slug, games, savedIds, onlineAvailable }) {
  const gameKey = safeDecode(slug);
  const game = games.find(
    (candidate) => String(candidate.slug) === gameKey || String(candidate.id) === gameKey
  );

  if (!game) {
    return `
      ${TopAppBar({ title: "Game not found", subtitle: "This game may have moved." })}
      <section class="screen-section">
        ${EmptyState({
          title: "Game not found",
          message: "Explore the library to find something else to play.",
          action: `<a class="primary-button" href="#/explore">Explore Games</a>`
        })}
      </section>
    `;
  }

  const related = getRelatedGames(game, games);
  const saved = savedIds.has(game.id);
  const equipmentList =
    game.requirementCategory === "no-equipment"
      ? `<p class="equipment-none">No equipment needed.</p>`
      : `<ul class="equipment-list">
          ${game.equipment
            .map(
              (item) => `<li><span>${escapeHtml(item.name)}</span>${item.quantity ? `<small>${escapeHtml(item.quantity)}</small>` : ""}${item.optional ? `<em>Optional</em>` : ""}</li>`
            )
            .join("")}
        </ul>`;

  return `
    ${DetailHero({ game, saved, onlineAvailable })}
    <section class="detail-body">
      <div class="detail-summary">
        <p>${escapeHtml(game.description)}</p>
      </div>
      ${QuickInfoRow(game)}
      <section class="detail-section">
        <h2>Required Equipment</h2>
        ${equipmentList}
      </section>
      ${InstructionList({ title: "Setup", items: game.setupInstructions })}
      ${InstructionList({ title: "How to Play", items: game.playInstructions, ordered: true })}
      ${InstructionList({ title: "Rules", items: game.rules })}
      ${
        game.winCondition
          ? `<section class="detail-section"><h2>Winning</h2><p>${escapeHtml(game.winCondition)}</p></section>`
          : ""
      }
      ${game.tips?.length ? InstructionList({ title: "Tips", items: game.tips }) : ""}
      ${VariationCards(game.variations)}
      <section class="detail-section">
        <h2>Similar Games</h2>
        ${GameGrid({ games: related, savedIds })}
      </section>
    </section>
  `;
}

function PreferenceSection({ title, key, type, selected, options }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];

  return `
    <section class="preference-section screen-section">
      <h2>${escapeHtml(title)}</h2>
      <div class="preference-chip-row" role="list">
        ${options
          .map((option) => {
            const isSelected = selectedValues.includes(option.id);
            const label =
              key === "styles" && option.id !== "social" && option.id !== "creative"
                ? getGameTypeLabel(option.id)
                : option.label;
            return `
              <button
                class="chip filter-chip ${isSelected ? "is-selected" : ""}"
                type="button"
                role="listitem"
                aria-pressed="${isSelected}"
                data-action="preference-choice"
                data-key="${escapeAttr(key)}"
                data-mode="${escapeAttr(type)}"
                data-value="${escapeAttr(option.id)}"
              >
                ${isSelected ? icon("check", 15) : ""}
                <span>${escapeHtml(label)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}
