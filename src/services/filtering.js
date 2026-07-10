import {
  AGE_GROUPS,
  DEFAULT_ADVANCED_FILTERS,
  DIFFICULTIES,
  DURATION_RANGES,
  EQUIPMENT_REQUIREMENTS,
  GAME_TYPES,
  PLAYER_RANGES,
  PLAY_STYLES,
  REQUIREMENT_CATEGORIES
} from "../data/constants.js?v=20260710-hokm-online2";

const labelMaps = {
  gameTypes: mapLabels(GAME_TYPES),
  requirements: mapLabels(EQUIPMENT_REQUIREMENTS),
  playerCounts: mapLabels(PLAYER_RANGES),
  durations: mapLabels(DURATION_RANGES),
  playStyles: mapLabels(PLAY_STYLES),
  difficulties: mapLabels(DIFFICULTIES),
  ageGroups: mapLabels(AGE_GROUPS),
  requirementsTop: mapLabels(REQUIREMENT_CATEGORIES)
};

function mapLabels(options) {
  return options.reduce((acc, option) => {
    acc[option.id] = option.label;
    return acc;
  }, {});
}

export function getRequirementLabel(id) {
  return labelMaps.requirementsTop[id] || labelMaps.requirements[id] || "Any Requirement";
}

export function getGameTypeLabel(id) {
  return labelMaps.gameTypes[id] || id;
}

export function getPlayStyleLabel(id) {
  return labelMaps.playStyles[id] || id;
}

export function getDifficultyLabel(id) {
  return labelMaps.difficulties[id] || id;
}

export function formatPlayers(game) {
  if (!game.playerMax || game.playerMin === game.playerMax) {
    return `${game.playerMin} Player${game.playerMin === 1 ? "" : "s"}`;
  }
  return `${game.playerMin}-${game.playerMax} Players`;
}

export function formatDuration(game) {
  if (!game.durationMax || game.durationMin === game.durationMax) {
    return `${game.durationMin} min`;
  }
  return `${game.durationMin}-${game.durationMax} min`;
}

export function formatEquipment(game) {
  if (game.requirementCategory === "no-equipment") return "No Equipment";
  if (game.requirementCategory === "online") return "Online";
  return game.equipment?.[0]?.name || "Simple Equipment";
}

export function normalizeFilters(filters = {}) {
  return Object.keys(DEFAULT_ADVANCED_FILTERS).reduce((acc, key) => {
    acc[key] = Array.isArray(filters[key]) ? filters[key] : [];
    return acc;
  }, {});
}

export function countAdvancedFilters(filters = {}) {
  return Object.values(normalizeFilters(filters)).reduce((total, value) => total + value.length, 0);
}

export function summarizeFilters(filters = {}) {
  const normalized = normalizeFilters(filters);
  const chips = [];

  for (const key of Object.keys(normalized)) {
    for (const id of normalized[key]) {
      chips.push({
        key,
        id,
        label: labelMaps[key]?.[id] || id
      });
    }
  }

  return chips;
}

export function filterGames(games, criteria = {}) {
  const {
    search = "",
    requirement = "all",
    quickFilters = [],
    advancedFilters = DEFAULT_ADVANCED_FILTERS
  } = criteria;
  const normalizedAdvanced = normalizeFilters(advancedFilters);

  return games.filter((game) => {
    if (!matchesSearch(game, search)) return false;
    if (!matchesRequirement(game, requirement)) return false;
    if (!matchesQuickFilters(game, quickFilters)) return false;
    if (!matchesAdvancedFilters(game, normalizedAdvanced)) return false;
    return true;
  });
}

export function sortGames(games, sort = "recommended", preferences = {}) {
  const list = [...games];

  if (sort === "popular") {
    return list.sort((a, b) => b.popularityScore - a.popularityScore);
  }
  if (sort === "recent") {
    return list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }
  if (sort === "shortest") {
    return list.sort((a, b) => a.durationMin - b.durationMin);
  }
  if (sort === "most-players") {
    return list.sort((a, b) => (b.playerMax || b.playerMin) - (a.playerMax || a.playerMin));
  }
  if (sort === "no-equipment") {
    return list.sort((a, b) => {
      const scoreA = a.requirementCategory === "no-equipment" ? 1 : 0;
      const scoreB = b.requirementCategory === "no-equipment" ? 1 : 0;
      return scoreB - scoreA || b.popularityScore - a.popularityScore;
    });
  }

  return list.sort((a, b) => recommendationScore(b, preferences) - recommendationScore(a, preferences));
}

export function getFeaturedGames(games, criteria = {}, preferences = {}) {
  return sortGames(
    filterGames(games, criteria).filter((game) => game.featured || game.trending),
    "recommended",
    preferences
  );
}

export function getRelatedGames(game, games) {
  const explicit = (game.relatedGameIds || [])
    .map((id) => games.find((candidate) => candidate.id === id))
    .filter(Boolean);

  if (explicit.length >= 4) {
    return explicit.slice(0, 4);
  }

  const fallback = games
    .filter((candidate) => candidate.id !== game.id)
    .map((candidate) => ({
      game: candidate,
      score:
        overlap(candidate.gameTypes, game.gameTypes) * 3 +
        overlap(candidate.playStyles, game.playStyles) * 2 +
        (candidate.requirementCategory === game.requirementCategory ? 2 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.game);

  return [...explicit, ...fallback.filter((candidate) => !explicit.includes(candidate))].slice(0, 4);
}

export function pickRandomGame(games, constraints = {}, activeCriteria = {}, preferences = {}) {
  const activeAdvanced = normalizeFilters(activeCriteria.advancedFilters);
  const advancedFilters = { ...activeAdvanced };
  if (constraints.playerCount) advancedFilters.playerCounts = [constraints.playerCount];
  if (constraints.duration) advancedFilters.durations = [constraints.duration];
  if (constraints.activityLevel) advancedFilters.activityLevels = [constraints.activityLevel];
  if (constraints.environment) advancedFilters.environments = [constraints.environment];

  const criteria = {
    ...activeCriteria,
    requirement: constraints.requirement || activeCriteria.requirement || "all",
    advancedFilters
  };

  const pool = sortGames(filterGames(games, criteria), "recommended", preferences);
  const fallbackPool = sortGames(filterGames(games, activeCriteria), "recommended", preferences);
  const finalPool = pool.length ? pool : fallbackPool;
  const selected = finalPool[Math.floor(Math.random() * finalPool.length)];

  return {
    game: selected,
    fromFallback: !pool.length,
    matchCount: finalPool.length,
    reasons: selected ? getMatchReasons(selected, constraints) : []
  };
}

function recommendationScore(game, preferences = {}) {
  let score = game.popularityScore || 0;
  const preferredStyles = preferences.styles || [];

  score += overlap(game.gameTypes, preferredStyles) * 12;
  score += overlap(game.tags, preferredStyles) * 10;
  score += overlap(game.playStyles, preferredStyles) * 8;

  if (preferences.activityLevel && game.activityLevel === preferences.activityLevel) score += 8;
  if (preferences.environment && game.environments.includes(preferences.environment)) score += 8;

  const range = PLAYER_RANGES.find((item) => item.id === preferences.groupSize);
  if (range && gameSupportsRange(game, range)) score += 10;

  if (game.trending) score += 4;
  if (game.featured) score += 3;

  return score;
}

function matchesSearch(game, rawSearch) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;

  const haystack = [
    game.title,
    game.shortDescription,
    game.description,
    game.requirementCategory,
    ...game.gameTypes.map((type) => labelMaps.gameTypes[type] || type),
    ...game.tags,
    ...game.skills,
    ...game.environments,
    ...game.playStyles,
    ...game.equipment.map((item) => item.name)
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function matchesRequirement(game, requirement) {
  return requirement === "all" || game.requirementCategory === requirement;
}

function matchesQuickFilters(game, quickFilters = []) {
  if (!quickFilters.length) return true;

  return quickFilters.every((filter) => {
    if (filter === "quick") return game.durationMin <= 15;
    if (filter === "outdoor") return game.environments.includes("outdoor");
    return (
      game.gameTypes.includes(filter) ||
      game.tags.includes(filter) ||
      game.playStyles.includes(filter) ||
      game.activityLevel === filter
    );
  });
}

function matchesAdvancedFilters(game, filters) {
  if (filters.gameTypes.length && !overlap(game.gameTypes, filters.gameTypes)) return false;
  if (filters.requirements.length && !game.equipment.some((item) => filters.requirements.includes(item.id))) {
    return false;
  }
  if (filters.playerCounts.length && !filters.playerCounts.some((id) => gameSupportsRange(game, rangeById(PLAYER_RANGES, id)))) {
    return false;
  }
  if (filters.durations.length && !filters.durations.some((id) => gameSupportsDuration(game, rangeById(DURATION_RANGES, id)))) {
    return false;
  }
  if (filters.activityLevels.length && !filters.activityLevels.includes(game.activityLevel)) return false;
  if (filters.environments.length && !overlap(game.environments, filters.environments)) return false;
  if (filters.playStyles.length && !overlap(game.playStyles, filters.playStyles)) return false;
  if (filters.difficulties.length && !filters.difficulties.includes(game.difficulty)) return false;
  if (filters.ageGroups.length && !overlap(game.ageGroups, filters.ageGroups)) return false;

  return true;
}

function gameSupportsRange(game, range) {
  if (!range) return false;
  const gameMax = game.playerMax || game.playerMin;
  return game.playerMin <= range.max && gameMax >= range.min;
}

function gameSupportsDuration(game, range) {
  if (!range) return false;
  const gameMax = game.durationMax || game.durationMin;
  return game.durationMin <= range.max && gameMax >= range.min;
}

function rangeById(ranges, id) {
  return ranges.find((range) => range.id === id);
}

function overlap(a = [], b = []) {
  const bSet = new Set(b);
  return a.reduce((count, item) => count + (bSet.has(item) ? 1 : 0), 0);
}

function getMatchReasons(game, constraints) {
  const reasons = [];
  if (constraints.playerCount) reasons.push(`Fits ${labelMaps.playerCounts[constraints.playerCount].toLowerCase()}`);
  if (constraints.duration) reasons.push(`Works in ${labelMaps.durations[constraints.duration].toLowerCase()}`);
  if (constraints.requirement && constraints.requirement !== "all") {
    reasons.push(`Matches ${getRequirementLabel(constraints.requirement).toLowerCase()}`);
  }
  if (constraints.activityLevel) reasons.push(`${game.activityLevel.replace("-", " ")} activity`);
  if (constraints.environment) reasons.push(`Playable ${constraints.environment.replace("-", " ")}`);

  if (!reasons.length) {
    reasons.push("High match for your current preferences");
  }

  return reasons.slice(0, 3);
}
